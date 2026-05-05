export interface ToolCallResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export class MockMcpServer {
  tools = new Map<
    string,
    (args: Record<string, unknown>) => Promise<ToolCallResult>
  >();

  tool(
    name: string,
    _descriptionOrSchema: string | unknown,
    handlerOrSchema?: unknown,
    handler?: unknown,
  ) {
    const actualHandler =
      typeof handlerOrSchema === "function"
        ? handlerOrSchema
        : handler;

    this.tools.set(
      name,
      actualHandler as (args: Record<string, unknown>) => Promise<ToolCallResult>,
    );
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolCallResult> {
    const handler = this.tools.get(name);
    if (!handler) {
      throw new Error(`Tool ${name} not registered`);
    }
    return handler(args);
  }
}
