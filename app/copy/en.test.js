import { copy, executeWithRecovery } from './en';

describe('en.js copy object', () => {
  it('exports a valid nested object', () => {
    expect(copy).toBeDefined();
    expect(copy.home.heroTitle).toBeDefined();
  });
});

describe('executeWithRecovery in en.js', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid inputs deterministically', async () => {
    // @ts-ignore
    await expect(executeWithRecovery(null)).rejects.toThrow('operation must be a function');
  });

  it('handles successful completion on first try', async () => {
    const op = jest.fn().mockResolvedValue('success');
    const result = await executeWithRecovery(op);
    expect(result).toBe('success');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('handles idempotent retries and recovers from partial failure', async () => {
    let calls = 0;
    const op = jest.fn().mockImplementation(async () => {
      calls++;
      if (calls < 3) throw new Error('Transient error');
      return 'recovered';
    });

    const result = await executeWithRecovery(op, { retries: 3, timeoutMs: 50 });
    expect(result).toBe('recovered');
    expect(calls).toBe(3);
    expect(op).toHaveBeenCalledTimes(3);
  });

  it('exhausts retries and falls back deterministically without data loss', async () => {
    const op = jest.fn().mockRejectedValue(new Error('Fatal API Error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const fallbackData = { safe: true, cached: 'old data' };
    const result = await executeWithRecovery(op, { retries: 2, timeoutMs: 50, fallback: fallbackData });

    expect(result).toBe(fallbackData);
    expect(op).toHaveBeenCalledTimes(3); // Initial + 2 retries
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Recovery] Operation failed after retries:'),
      'Fatal API Error'
    );
  });

  it('throws a safe error if retries exhausted and no fallback provided', async () => {
    const op = jest.fn().mockRejectedValue(new Error('Secret DB crash'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(executeWithRecovery(op, { retries: 1, timeoutMs: 50 }))
      .rejects.toThrow('Deterministic failure recovery exhausted: Secret DB crash');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('enforces timing boundaries', async () => {
    const op = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('late'), 100))
    );

    await expect(executeWithRecovery(op, { retries: 0, timeoutMs: 10 }))
      .rejects.toThrow('Deterministic failure recovery exhausted: Timeout');
  });
});
