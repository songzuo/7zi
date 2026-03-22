/**
 * Agent Card Tests
 */

// @ts-ignore - Optional properties and type compatibility
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAgentCard,
  createExtendedAgentCard,
  getAgentCard,
  getExtendedAgentCard,
  resetAgentCards,
} from '../agent-card';

describe('createAgentCard', () => {
  it('should create agent card with default baseUrl', () => {
    const card = createAgentCard();
    expect(card).toBeDefined();
    expect(card.name).toBe('7zi Agent');
    expect(card.url).toBe('http://localhost:3000/api/a2a/jsonrpc');
  });

  it('should create agent card with custom baseUrl', () => {
    const card = createAgentCard('https://example.com');
    expect(card.url).toBe('https://example.com/api/a2a/jsonrpc');
    expect(card.documentationUrl).toBe('https://example.com/docs/a2a');
  });

  it('should have correct version information', () => {
    const card = createAgentCard();
    expect(card.version).toBe('1.0.0');
    expect(card.protocolVersion).toBe('0.3.0');
  });

  it('should have required skills', () => {
    const card = createAgentCard();
    expect(card.skills).toBeDefined();
    expect(card.skills.length).toBeGreaterThan(0);
    
    const skillIds = card.skills.map(s => s.id);
    expect(skillIds).toContain('chat');
    expect(skillIds).toContain('analyze');
    expect(skillIds).toContain('task');
  });

  it('should have correct skill structure', () => {
    const card = createAgentCard();
    const chatSkill = card.skills.find(s => s.id === 'chat');
    
    expect(chatSkill).toBeDefined();
    expect(chatSkill?.name).toBe('Chat');
    expect(chatSkill?.description).toBeDefined();
    expect(chatSkill?.tags).toBeDefined();
    expect(chatSkill?.examples).toBeDefined();
    expect(chatSkill?.inputModes).toBeDefined();
    expect(chatSkill?.outputModes).toBeDefined();
  });

  it('should have capabilities', () => {
    const card = createAgentCard();
    expect(card.capabilities).toBeDefined();
    expect(card.capabilities!.streaming).toBe(true);
    expect(card.capabilities!.pushNotifications).toBe(false);
    expect(card.capabilities!.stateTransitionHistory).toBe(true);
    expect(card.capabilities!.extendedAgentCard).toBe(true);
  });

  it('should have default input/output modes', () => {
    const card = createAgentCard();
    expect(card.defaultInputModes).toContain('text/plain');
    expect(card.defaultInputModes).toContain('application/json');
    expect(card.defaultOutputModes).toContain('text/plain');
    expect(card.defaultOutputModes).toContain('application/json');
  });

  it('should have additional interfaces', () => {
    const card = createAgentCard();
    expect(card.additionalInterfaces).toBeDefined();
    expect((card.additionalInterfaces || []).length).toBeGreaterThan(0);

    const jsonrpcInterface = (card.additionalInterfaces || []).find(
      i => i.transport === 'JSONRPC'
    );
    expect(jsonrpcInterface).toBeDefined();
    expect(jsonrpcInterface?.url).toContain('/api/a2a/jsonrpc');
  });

  it('should have security schemes', () => {
    const card = createAgentCard();
    expect(card.securitySchemes).toBeDefined();
    expect((card.securitySchemes || {}).bearerAuth).toBeDefined();
    expect((card.securitySchemes || {}).apiKey).toBeDefined();

    expect((card.securitySchemes || {}).bearerAuth?.type).toBe('http');
    expect((card.securitySchemes || {}).bearerAuth?.scheme).toBe('bearer');
    expect((card.securitySchemes || {}).apiKey?.type).toBe('apiKey');
  });

  it('should have empty security requirements (public access)', () => {
    const card = createAgentCard();
    expect(card.security).toBeDefined();
    expect((card.security || []).length).toBe(0);
  });

  it('should have provider info', () => {
    const card = createAgentCard();
    expect(card.provider).toBeDefined();
    expect(card.provider?.organization).toBe('7zi');
    expect(card.provider?.url).toBe('https://7zi.com');
  });

  it('should have documentation URL', () => {
    const card = createAgentCard('https://example.com');
    expect(card.documentationUrl).toBe('https://example.com/docs/a2a');
  });
});

describe('createExtendedAgentCard', () => {
  it('should include all base skills', () => {
    const baseCard = createAgentCard();
    const extendedCard = createExtendedAgentCard();
    
    const baseSkillIds = baseCard.skills.map(s => s.id);
    const extendedSkillIds = extendedCard.skills.map(s => s.id);
    
    baseSkillIds.forEach(skillId => {
      expect(extendedSkillIds).toContain(skillId);
    });
  });

  it('should include admin skill', () => {
    const extendedCard = createExtendedAgentCard();
    const adminSkill = extendedCard.skills.find(s => s.id === 'admin');
    
    expect(adminSkill).toBeDefined();
    expect(adminSkill?.name).toBe('Admin Operations');
    expect(adminSkill?.description).toContain('authenticated');
  });

  it('should have more skills than base card', () => {
    const baseCard = createAgentCard();
    const extendedCard = createExtendedAgentCard();
    
    expect(extendedCard.skills.length).toBeGreaterThan(baseCard.skills.length);
  });

  it('should inherit base card properties', () => {
    const extendedCard = createExtendedAgentCard('https://example.com');
    
    expect(extendedCard.name).toBe('7zi Agent');
    expect(extendedCard.version).toBe('1.0.0');
    expect(extendedCard.protocolVersion).toBe('0.3.0');
    expect(extendedCard.url).toBe('https://example.com/api/a2a/jsonrpc');
  });
});

describe('getAgentCard', () => {
  beforeEach(() => {
    resetAgentCards();
  });

  it('should return agent card', () => {
    const card = getAgentCard();
    expect(card).toBeDefined();
    expect(card.name).toBe('7zi Agent');
  });

  it('should cache agent card', () => {
    const card1 = getAgentCard();
    const card2 = getAgentCard();
    expect(card1).toBe(card2);
  });

  it('should use default baseUrl', () => {
    const card = getAgentCard();
    expect(card.url).toContain('localhost');
  });

  it('should accept custom baseUrl', () => {
    const card = getAgentCard('https://custom.com');
    expect(card.url).toContain('custom.com');
  });

  it('should recreate card with new baseUrl', () => {
    const card1 = getAgentCard('https://first.com');
    const card2 = getAgentCard('https://second.com');
    expect(card1.url).toContain('first.com');
    expect(card2.url).toContain('second.com');
  });
});

describe('getExtendedAgentCard', () => {
  beforeEach(() => {
    resetAgentCards();
  });

  it('should return extended agent card', () => {
    const card = getExtendedAgentCard();
    expect(card).toBeDefined();
    expect(card.name).toBe('7zi Agent');
  });

  it('should include admin skill', () => {
    const card = getExtendedAgentCard();
    const adminSkill = card.skills.find(s => s.id === 'admin');
    expect(adminSkill).toBeDefined();
  });

  it('should cache extended agent card', () => {
    const card1 = getExtendedAgentCard();
    const card2 = getExtendedAgentCard();
    expect(card1).toBe(card2);
  });

  it('should use default baseUrl', () => {
    const card = getExtendedAgentCard();
    expect(card.url).toContain('localhost');
  });

  it('should accept custom baseUrl', () => {
    const card = getExtendedAgentCard('https://custom.com');
    expect(card.url).toContain('custom.com');
  });
});

describe('resetAgentCards', () => {
  it('should reset cached cards', () => {
    const card1 = getAgentCard();
    const extCard1 = getExtendedAgentCard();
    
    resetAgentCards();
    
    const card2 = getAgentCard();
    const extCard2 = getExtendedAgentCard();
    
    expect(card1).not.toBe(card2);
    expect(extCard1).not.toBe(extCard2);
  });

  it('should allow recreation with new config', () => {
    const card1 = getAgentCard('https://first.com');
    resetAgentCards();
    const card2 = getAgentCard('https://second.com');
    
    expect(card1.url).toContain('first.com');
    expect(card2.url).toContain('second.com');
  });
});

describe('Agent Card Structure', () => {
  it('should have all required fields', () => {
    const card = createAgentCard();
    
    expect(card.name).toBeDefined();
    expect(card.description).toBeDefined();
    expect(card.version).toBeDefined();
    expect(card.protocolVersion).toBeDefined();
    expect(card.url).toBeDefined();
    expect(card.skills).toBeDefined();
    expect(card.capabilities).toBeDefined();
    expect(card.defaultInputModes).toBeDefined();
    expect(card.defaultOutputModes).toBeDefined();
    expect(card.securitySchemes).toBeDefined();
    expect(card.security).toBeDefined();
    expect(card.documentationUrl).toBeDefined();
    expect(card.provider).toBeDefined();
  });

  it('should have valid skill examples', () => {
    const card = createAgentCard();

    card.skills.forEach(skill => {
      expect(skill.examples).toBeDefined();
      expect((skill.examples || []).length).toBeGreaterThan(0);
      expect((skill.examples || []).every(ex => typeof ex === 'string')).toBe(true);
    });
  });

  it('should have valid skill tags', () => {
    const card = createAgentCard();

    card.skills.forEach(skill => {
      expect(skill.tags).toBeDefined();
      expect((skill.tags || []).length).toBeGreaterThan(0);
      expect((skill.tags || []).every(tag => typeof tag === 'string')).toBe(true);
    });
  });

  it('should have valid input/output modes', () => {
    const card = createAgentCard();

    card.skills.forEach(skill => {
      expect(skill.inputModes).toBeDefined();
      expect((skill.inputModes || []).length).toBeGreaterThan(0);
      expect(skill.outputModes).toBeDefined();
      expect((skill.outputModes || []).length).toBeGreaterThan(0);
    });
  });
});
