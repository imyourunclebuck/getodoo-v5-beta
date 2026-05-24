import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { OdooClient } from "./lib/odoo";
import { processUserMessage, detectImplicitLearning } from "./lib/agent";
import { KnowledgeManager } from "./lib/knowledge";
import { chatStorage } from "./replit_integrations/chat/storage";
import { z } from "zod";
import { setupAuth } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);

  let defaultConversationId = 1;
  try {
    const conversations = await chatStorage.getAllConversations();
    if (conversations.length === 0) {
      const newConvo = await chatStorage.createConversation("General Chat");
      defaultConversationId = newConvo.id;
    } else {
      defaultConversationId = conversations[0].id;
    }
  } catch (error) {
    console.error("Error seeding conversation:", error);
  }
  
  app.get(api.settings.get.path, async (req, res) => {
    const settings = await storage.getSettings();
    if (settings) {
      res.json({
        ...settings,
        odooPassword: settings.odooPassword ? "••••••••" : "",
      });
    } else {
      res.json({
        id: 0,
        odooUrl: "",
        odooDb: "",
        odooUsername: "",
        odooPassword: "",
        responseStyle: "detailed",
      });
    }
  });

  app.post(api.settings.update.path, async (req, res) => {
    try {
      const input = api.settings.update.input.parse(req.body);
      if (input.odooPassword === "••••••••") {
        const existing = await storage.getSettings();
        if (existing) {
          input.odooPassword = existing.odooPassword;
        }
      }
      if (input.odooUrl) {
        try {
          const parsed = new URL(input.odooUrl);
          if (!["http:", "https:"].includes(parsed.protocol)) {
            return res.status(400).json({ message: "Odoo URL must use http or https", field: "odooUrl" });
          }
          input.odooUrl = input.odooUrl.replace(/\/$/, "");
        } catch {
          return res.status(400).json({ message: "Invalid Odoo URL format", field: "odooUrl" });
        }
      }
      const validStyles = ["detailed", "concise", "summary"];
      if (!validStyles.includes(input.responseStyle || "")) {
        input.responseStyle = "detailed";
      }
      const updated = await storage.updateSettings(input);
      res.json({
        ...updated,
        odooPassword: updated.odooPassword ? "••••••••" : "",
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get(api.chat.history.path, async (req, res) => {
    const history = await storage.getMessages();
    res.json(history);
  });

  app.delete(api.chat.clear.path, async (req, res) => {
    await storage.clearMessages();
    res.status(204).send();
  });

  app.post(api.chat.send.path, async (req, res) => {
    try {
      const { message } = req.body;
      
      const settings = await storage.getSettings();
      if (!settings) {
        return res.status(400).json({ 
          message: "Odoo settings are not configured. Please go to settings and configure your Odoo connection." 
        });
      }

      const odooClient = new OdooClient({
        url: settings.odooUrl,
        db: settings.odooDb,
        username: settings.odooUsername,
        password: settings.odooPassword,
      });

      try {
        await odooClient.authenticate();
      } catch (authErr: any) {
        return res.status(400).json({
          message: `Odoo Authentication Failed: ${authErr.message}`
        });
      }

      const knowledgeManager = new KnowledgeManager(odooClient);

      try {
        await knowledgeManager.loadKnowledge();
      } catch (knowledgeErr: any) {
        console.warn("Knowledge loading failed (non-fatal):", knowledgeErr.message);
      }

      try {
        await detectImplicitLearning(message, knowledgeManager);
      } catch (learnErr) {
        console.warn("Implicit learning detection failed (non-fatal):", learnErr);
      }

      await storage.createMessage({
        conversationId: defaultConversationId,
        role: "user",
        content: message,
      });

      const allHistory = await storage.getMessages();
      const contextHistory = allHistory.slice(-10).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));

      const { response: responseContent, learnedSomething } = await processUserMessage(
        message, 
        odooClient, 
        contextHistory,
        { 
          knowledgeManager, 
          responseStyle: settings.responseStyle || "detailed",
          odooUrl: settings.odooUrl,
          odooDb: settings.odooDb,
        }
      );

      await storage.createMessage({
        conversationId: defaultConversationId,
        role: "assistant",
        content: responseContent,
      });

      res.json({ 
        response: responseContent,
        learned: learnedSomething 
      });

    } catch (err: any) {
      console.error("Chat Error:", err);
      res.status(500).json({ message: err.message || "Internal Server Error" });
    }
  });

  app.get("/api/knowledge", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings) {
        return res.status(400).json({ message: "Odoo settings not configured" });
      }

      const odooClient = new OdooClient({
        url: settings.odooUrl,
        db: settings.odooDb,
        username: settings.odooUsername,
        password: settings.odooPassword,
      });

      await odooClient.authenticate();
      const knowledgeManager = new KnowledgeManager(odooClient);
      const knowledge = await knowledgeManager.loadKnowledge(true);

      res.json({
        corrections: Object.fromEntries(knowledge.corrections),
        terminology: Object.fromEntries(knowledge.terminology),
        preferences: Object.fromEntries(knowledge.preferences),
        businessContext: knowledge.businessContext,
        frequentRecords: Object.fromEntries(knowledge.frequentRecords),
        fieldMeanings: Object.fromEntries(knowledge.fieldMeanings),
      });
    } catch (err: any) {
      console.error("Knowledge fetch error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/knowledge", async (req, res) => {
    try {
      const { type, key, value } = req.body;
      
      if (!type || !key || !value) {
        return res.status(400).json({ message: "Missing required fields: type, key, value" });
      }

      const settings = await storage.getSettings();
      if (!settings) {
        return res.status(400).json({ message: "Odoo settings not configured" });
      }

      const odooClient = new OdooClient({
        url: settings.odooUrl,
        db: settings.odooDb,
        username: settings.odooUsername,
        password: settings.odooPassword,
      });

      await odooClient.authenticate();
      const knowledgeManager = new KnowledgeManager(odooClient);
      const taskId = await knowledgeManager.saveKnowledge(type, key, value);

      res.json({ success: true, taskId });
    } catch (err: any) {
      console.error("Knowledge save error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
