export abstract class SlackBlock {
  protected constructor(
    public readonly type: string,
    public readonly blockId?: string,
  ) {
  }

  abstract get block(): object;
}
