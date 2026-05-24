
interface OdooConfig {
  url: string;
  db: string;
  username: string;
  password: string;
}

interface OdooRpcResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data: { message: string; debug?: string };
  };
}

export class OdooClient {
  private config: OdooConfig;
  private uid: number | null = null;

  constructor(config: OdooConfig) {
    // Ensure URL doesn't have trailing slash
    this.config = {
      ...config,
      url: config.url.replace(/\/$/, ""),
    };
  }

  private async rpc(service: string, method: string, args: any[]): Promise<any> {
    const endpoint = "/jsonrpc";
    try {
      const response = await fetch(`${this.config.url}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "call",
          params: {
            service,
            method,
            args,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data: OdooRpcResponse = await response.json();

      if (data.error) {
        throw new Error(
          `Odoo Error: ${data.error.message} - ${data.error.data?.message || JSON.stringify(data.error.data)}`
        );
      }

      return data.result;
    } catch (error) {
      console.error("Odoo RPC Error:", error);
      throw error;
    }
  }

  async authenticate(): Promise<number> {
    if (this.uid) return this.uid;

    const uid = await this.rpc("common", "authenticate", [
      this.config.db,
      this.config.username,
      this.config.password,
      {},
    ]);

    if (!uid) {
      throw new Error("Odoo authentication failed. Check credentials.");
    }

    this.uid = uid;
    return uid;
  }

  async executeKw(
    model: string,
    method: string,
    args: any[],
    kwargs: Record<string, any> = {}
  ): Promise<any> {
    const uid = await this.authenticate();
    return await this.rpc("object", "execute_kw", [
      this.config.db,
      uid,
      this.config.password,
      model,
      method,
      args,
      kwargs,
    ]);
  }

  async searchRead(
    model: string,
    domain: any[] = [],
    fields: string[] = ["id", "name"],
    limit: number = 10,
    offset: number = 0
  ) {
    return await this.executeKw(model, "search_read", [domain], {
      fields,
      limit,
      offset,
    });
  }

  async create(model: string, values: Record<string, any>) {
    return await this.executeKw(model, "create", [values]);
  }

  async write(model: string, ids: number[], values: Record<string, any>) {
    return await this.executeKw(model, "write", [ids, values]);
  }

  async unlink(model: string, ids: number[]) {
    return await this.executeKw(model, "unlink", [ids]);
  }

  async getModelFields(model: string, attributes: string[] = ["string", "help", "type", "required", "readonly"]) {
    return await this.executeKw(model, "fields_get", [], { attributes });
  }

  async read(model: string, ids: number[], fields: string[] = []) {
    return await this.executeKw(model, "read", [ids], fields.length ? { fields } : {});
  }

  async searchCount(model: string, domain: any[] = []) {
    return await this.executeKw(model, "search_count", [domain]);
  }

  async nameSearch(model: string, name: string, limit: number = 10) {
    return await this.executeKw(model, "name_search", [name], { limit });
  }

  async callButton(model: string, method: string, ids: number[], args: any[] = []) {
    return await this.executeKw(model, method, [ids, ...args]);
  }
}
