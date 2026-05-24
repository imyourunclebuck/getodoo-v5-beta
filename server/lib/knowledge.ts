import { OdooClient } from "./odoo";

export interface KnowledgeEntry {
  id: number;
  type: "correction" | "terminology" | "preference" | "context" | "frequent_record" | "field_meaning";
  key: string;
  value: string;
  examples?: string;
  createdAt: string;
}

export interface ParsedKnowledge {
  corrections: Map<string, string>;
  terminology: Map<string, string>;
  preferences: Map<string, string>;
  businessContext: string[];
  frequentRecords: Map<string, { model: string; id: number; name: string }>;
  fieldMeanings: Map<string, string>;
}

const KNOWLEDGE_PROJECT_NAME = "Lumin Laboratories Knowledge Base";
const KNOWLEDGE_TASK_PREFIX = "[KB]";

export class KnowledgeManager {
  private odooClient: OdooClient;
  private projectId: number | null = null;
  private cachedKnowledge: ParsedKnowledge | null = null;
  private lastFetchTime: number = 0;
  private cacheDurationMs: number = 60000;

  constructor(odooClient: OdooClient) {
    this.odooClient = odooClient;
  }

  async ensureKnowledgeProject(): Promise<number> {
    if (this.projectId) return this.projectId;

    try {
      const projects = await this.odooClient.searchRead(
        "project.project",
        [["name", "=", KNOWLEDGE_PROJECT_NAME]],
        ["id", "name"],
        1
      );

      if (projects && projects.length > 0) {
        this.projectId = projects[0].id;
        return this.projectId;
      }

      const newProjectId = await this.odooClient.create("project.project", {
        name: KNOWLEDGE_PROJECT_NAME,
        description: "This project stores learned knowledge for Lumin Laboratories AI assistant. Do not delete.",
        privacy_visibility: "employees",
      });

      this.projectId = newProjectId;
      console.log(`Created knowledge project with ID: ${newProjectId}`);
      return this.projectId;
    } catch (error: any) {
      console.error("Error ensuring knowledge project:", error.message);
      throw new Error(`Failed to setup knowledge project: ${error.message}`);
    }
  }

  async loadKnowledge(forceRefresh: boolean = false): Promise<ParsedKnowledge> {
    const now = Date.now();
    if (!forceRefresh && this.cachedKnowledge && (now - this.lastFetchTime) < this.cacheDurationMs) {
      return this.cachedKnowledge;
    }

    try {
      const projectId = await this.ensureKnowledgeProject();

      const tasks = await this.odooClient.searchRead(
        "project.task",
        [
          ["project_id", "=", projectId],
          ["name", "ilike", KNOWLEDGE_TASK_PREFIX],
        ],
        ["id", "name", "description", "create_date"],
        500
      );

      const knowledge: ParsedKnowledge = {
        corrections: new Map(),
        terminology: new Map(),
        preferences: new Map(),
        businessContext: [],
        frequentRecords: new Map(),
        fieldMeanings: new Map(),
      };

      for (const task of tasks || []) {
        const parsed = this.parseKnowledgeTask(task);
        if (!parsed) continue;

        switch (parsed.type) {
          case "correction":
            knowledge.corrections.set(parsed.key.toLowerCase(), parsed.value);
            break;
          case "terminology":
            knowledge.terminology.set(parsed.key.toLowerCase(), parsed.value);
            break;
          case "preference":
            knowledge.preferences.set(parsed.key.toLowerCase(), parsed.value);
            break;
          case "context":
            knowledge.businessContext.push(parsed.value);
            break;
          case "frequent_record":
            try {
              const recordData = JSON.parse(parsed.value);
              knowledge.frequentRecords.set(parsed.key.toLowerCase(), recordData);
            } catch {
              console.warn(`Failed to parse frequent record: ${parsed.value}`);
            }
            break;
          case "field_meaning":
            knowledge.fieldMeanings.set(parsed.key.toLowerCase(), parsed.value);
            break;
        }
      }

      this.cachedKnowledge = knowledge;
      this.lastFetchTime = now;
      return knowledge;
    } catch (error: any) {
      console.error("Error loading knowledge:", error.message);
      return {
        corrections: new Map(),
        terminology: new Map(),
        preferences: new Map(),
        businessContext: [],
        frequentRecords: new Map(),
        fieldMeanings: new Map(),
      };
    }
  }

  private parseKnowledgeTask(task: any): KnowledgeEntry | null {
    const nameMatch = task.name.match(/^\[KB\]\s*\[(\w+)\]\s*(.+)$/);
    if (!nameMatch) return null;

    const type = nameMatch[1].toLowerCase() as KnowledgeEntry["type"];
    const key = nameMatch[2].trim();
    const value = this.stripHtml(task.description || "");

    return {
      id: task.id,
      type,
      key,
      value,
      createdAt: task.create_date,
    };
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
  }

  async saveKnowledge(
    type: KnowledgeEntry["type"],
    key: string,
    value: string
  ): Promise<number> {
    try {
      const projectId = await this.ensureKnowledgeProject();

      const existingTasks = await this.odooClient.searchRead(
        "project.task",
        [
          ["project_id", "=", projectId],
          ["name", "=", `${KNOWLEDGE_TASK_PREFIX} [${type.toUpperCase()}] ${key}`],
        ],
        ["id"],
        1
      );

      const taskName = `${KNOWLEDGE_TASK_PREFIX} [${type.toUpperCase()}] ${key}`;
      const taskDescription = `<p>${value.replace(/\n/g, "<br/>")}</p>`;

      if (existingTasks && existingTasks.length > 0) {
        await this.odooClient.write("project.task", [existingTasks[0].id], {
          description: taskDescription,
        });
        this.cachedKnowledge = null;
        return existingTasks[0].id;
      }

      const newTaskId = await this.odooClient.create("project.task", {
        name: taskName,
        project_id: projectId,
        description: taskDescription,
      });

      this.cachedKnowledge = null;
      console.log(`Saved knowledge entry: ${type} - ${key}`);
      return newTaskId;
    } catch (error: any) {
      console.error("Error saving knowledge:", error.message);
      throw new Error(`Failed to save knowledge: ${error.message}`);
    }
  }

  async deleteKnowledge(taskId: number): Promise<boolean> {
    try {
      await this.odooClient.unlink("project.task", [taskId]);
      this.cachedKnowledge = null;
      return true;
    } catch (error: any) {
      console.error("Error deleting knowledge:", error.message);
      return false;
    }
  }

  generateKnowledgePrompt(): string {
    if (!this.cachedKnowledge) return "";

    const sections: string[] = [];

    if (this.cachedKnowledge.corrections.size > 0) {
      sections.push("## USER CORRECTIONS (Apply these corrections to understand user intent)");
      for (const [key, value] of this.cachedKnowledge.corrections) {
        sections.push(`- When user says "${key}", they mean: ${value}`);
      }
    }

    if (this.cachedKnowledge.terminology.size > 0) {
      sections.push("\n## TERMINOLOGY MAPPINGS (User's custom terms and abbreviations)");
      for (const [term, meaning] of this.cachedKnowledge.terminology) {
        sections.push(`- "${term}" = ${meaning}`);
      }
    }

    if (this.cachedKnowledge.preferences.size > 0) {
      sections.push("\n## USER PREFERENCES");
      for (const [pref, value] of this.cachedKnowledge.preferences) {
        sections.push(`- ${pref}: ${value}`);
      }
    }

    if (this.cachedKnowledge.businessContext.length > 0) {
      sections.push("\n## BUSINESS CONTEXT (Important facts about this organization)");
      for (const context of this.cachedKnowledge.businessContext) {
        sections.push(`- ${context}`);
      }
    }

    if (this.cachedKnowledge.frequentRecords.size > 0) {
      sections.push("\n## FREQUENTLY REFERENCED RECORDS");
      for (const [alias, record] of this.cachedKnowledge.frequentRecords) {
        sections.push(`- "${alias}" refers to ${record.model} ID ${record.id} (${record.name})`);
      }
    }

    if (this.cachedKnowledge.fieldMeanings.size > 0) {
      sections.push("\n## CUSTOM FIELD MEANINGS");
      for (const [field, meaning] of this.cachedKnowledge.fieldMeanings) {
        sections.push(`- ${field}: ${meaning}`);
      }
    }

    if (sections.length === 0) return "";

    return `\n---\n\n# LEARNED KNOWLEDGE\n\nThe following knowledge has been learned from previous interactions. Use this to better understand user requests.\n\n${sections.join("\n")}`;
  }

  async detectAndExtractLearning(
    userMessage: string,
    aiResponse: string,
    previousExchange?: { userMessage: string; aiResponse: string }
  ): Promise<{ type: KnowledgeEntry["type"]; key: string; value: string } | null> {
    const correctionPatterns = [
      /(?:no|not|wrong|incorrect|actually|i meant|i mean|when i say|by that i mean)\s+[""']?([^""']+)[""']?\s*(?:means?|is|refers? to|should be|i meant?)\s+[""']?([^""'.!?]+)/i,
      /[""']([^""']+)[""']\s+(?:means?|refers? to|is|should be)\s+[""']?([^""'.!?]+)/i,
      /(?:remember|note|always|whenever)\s+(?:that\s+)?[""']?([^""']+)[""']?\s+(?:means?|is|equals?|refers? to)\s+[""']?([^""'.!?]+)/i,
    ];

    for (const pattern of correctionPatterns) {
      const match = userMessage.match(pattern);
      if (match) {
        return {
          type: "correction",
          key: match[1].trim(),
          value: match[2].trim(),
        };
      }
    }

    const terminologyPatterns = [
      /(?:abbreviate|short for|stands for|abbr|shorthand|we call it|i call|called)\s+[""']?([^""']+)[""']?\s+(?:as|to|is|means?)\s+[""']?([^""'.!?]+)/i,
      /([A-Z]{2,})\s+(?:means?|stands for|is short for)\s+[""']?([^""'.!?]+)/i,
    ];

    for (const pattern of terminologyPatterns) {
      const match = userMessage.match(pattern);
      if (match) {
        return {
          type: "terminology",
          key: match[1].trim(),
          value: match[2].trim(),
        };
      }
    }

    const preferencePatterns = [
      /(?:always|prefer|want|like|show me|display|include)\s+(.+?)\s+(?:when|for|in)\s+(.+)/i,
      /(?:by default|normally|usually)\s+(?:show|include|display)\s+(.+)/i,
    ];

    for (const pattern of preferencePatterns) {
      const match = userMessage.match(pattern);
      if (match && match[2]) {
        return {
          type: "preference",
          key: match[2].trim(),
          value: match[1].trim(),
        };
      }
    }

    const contextPatterns = [
      /(?:our|my|we|the company)\s+(?:fiscal year|fy)\s+(?:starts?|begins?)\s+(?:in|on|at)\s+(.+)/i,
      /(?:remember|note|keep in mind|important)\s*[:\-]?\s*(.+)/i,
      /(?:we use|we have|our company uses?)\s+(.+)/i,
    ];

    for (const pattern of contextPatterns) {
      const match = userMessage.match(pattern);
      if (match) {
        return {
          type: "context",
          key: new Date().toISOString(),
          value: match[1].trim(),
        };
      }
    }

    return null;
  }

  getCachedKnowledge(): ParsedKnowledge | null {
    return this.cachedKnowledge;
  }
}

export function createFuzzySearchDomain(
  fieldName: string,
  searchTerm: string,
  knowledge?: ParsedKnowledge
): any[][] {
  const domains: any[][] = [];

  let resolvedTerm = searchTerm.toLowerCase();
  if (knowledge) {
    if (knowledge.terminology.has(resolvedTerm)) {
      resolvedTerm = knowledge.terminology.get(resolvedTerm)!;
    }
    if (knowledge.corrections.has(resolvedTerm)) {
      resolvedTerm = knowledge.corrections.get(resolvedTerm)!;
    }
  }

  domains.push([[fieldName, "ilike", `%${resolvedTerm}%`]]);

  const words = resolvedTerm.split(/\s+/);
  if (words.length > 1) {
    for (const word of words) {
      if (word.length >= 3) {
        domains.push([[fieldName, "ilike", `%${word}%`]]);
      }
    }
  }

  if (resolvedTerm.length >= 4) {
    const partialTerm = resolvedTerm.substring(0, Math.ceil(resolvedTerm.length * 0.7));
    domains.push([[fieldName, "ilike", `%${partialTerm}%`]]);
  }

  return domains;
}

export async function fuzzySearch(
  odooClient: OdooClient,
  model: string,
  searchTerm: string,
  fields: string[] = ["id", "name"],
  limit: number = 10,
  knowledge?: ParsedKnowledge
): Promise<any[]> {
  const results: any[] = [];
  const seenIds = new Set<number>();

  if (knowledge?.frequentRecords) {
    for (const [alias, record] of knowledge.frequentRecords) {
      if (
        record.model === model &&
        (alias.includes(searchTerm.toLowerCase()) ||
          record.name.toLowerCase().includes(searchTerm.toLowerCase()))
      ) {
        try {
          const [fullRecord] = await odooClient.read(model, [record.id], fields);
          if (fullRecord && !seenIds.has(fullRecord.id)) {
            results.push(fullRecord);
            seenIds.add(fullRecord.id);
          }
        } catch {
        }
      }
    }
  }

  const domains = createFuzzySearchDomain("name", searchTerm, knowledge);

  for (const domain of domains) {
    if (results.length >= limit) break;

    try {
      const records = await odooClient.searchRead(
        model,
        domain[0],
        fields,
        limit - results.length
      );

      for (const record of records || []) {
        if (!seenIds.has(record.id)) {
          results.push(record);
          seenIds.add(record.id);
        }
      }
    } catch (error) {
    }
  }

  try {
    const nameSearchResults = await odooClient.nameSearch(model, searchTerm, limit);
    for (const [id, name] of nameSearchResults || []) {
      if (!seenIds.has(id) && results.length < limit) {
        const [fullRecord] = await odooClient.read(model, [id], fields);
        if (fullRecord) {
          results.push(fullRecord);
          seenIds.add(id);
        }
      }
    }
  } catch {
  }

  return results.slice(0, limit);
}
