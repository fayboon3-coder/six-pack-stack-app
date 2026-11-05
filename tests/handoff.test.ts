import './setup-mocks';
import { describe, expect, it } from 'vitest';
import { quizFromHandoff } from '../src/lib/handoff';

describe('Stack Score → app handoff', () => {
  it('maps Stack Score answers to quiz answers', () => {
    const q = quizFromHandoff({ email: 'a@b.co', goal: 'Build muscle', spend: '$100–200', train: '4+', stack: ['pre', 'fatburner', 'whey'], at: Date.now() });
    expect(q.goal).toBe('Build muscle and stay lean');
    expect(q.monthly_spend).toBe('$100–$200');
    expect(q.days).toBe('4 days');
    expect(q.tried).toEqual(['Fat burners', 'Pre-workout', 'Protein powder']);
  });
  it('maps the new Stack Check product ids', () => {
    const q = quizFromHandoff({ stack: ['greens_powders', 'tongkat_ali', 'creatine'], at: Date.now() });
    expect(q.tried).toEqual(['Test boosters', 'Greens powder', 'Creatine']);
  });
  it('handles "I take nothing" and missing data', () => {
    expect(quizFromHandoff({ stack: [], at: Date.now() }).tried).toEqual(['None of these']);
    expect(quizFromHandoff(null)).toEqual({});
  });
});
