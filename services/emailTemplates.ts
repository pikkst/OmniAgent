/**
 * Email Templates Library
 * 
 * Provides pre-built email templates for common business scenarios
 * and template management functionality.
 */

import { supabase } from './supabase';
import { Lead } from '../types';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: 'cold_outreach' | 'follow_up' | 'introduction' | 'proposal' | 'meeting' | 'custom';
  variables: string[]; // e.g., ['leadName', 'companyName', 'product']
  createdAt: string;
  isBuiltIn: boolean;
}

/**
 * Built-in email templates
 */
const BUILT_IN_TEMPLATES: EmailTemplate[] = [
  {
    id: 'cold-outreach-1',
    name: 'Professional Cold Outreach',
    subject: 'Quick question about {{companyName}}',
    body: `Hi {{leadName}},

I came across {{companyName}} and was impressed by {{companyDetail}}.

I wanted to reach out because we help companies like yours {{valueProposition}}.

Would you be open to a brief 15-minute call next week to explore if there's a fit?

Best regards,
{{senderName}}
{{senderTitle}}`,
    category: 'cold_outreach',
    variables: ['leadName', 'companyName', 'companyDetail', 'valueProposition', 'senderName', 'senderTitle'],
    createdAt: new Date().toISOString(),
    isBuiltIn: true
  },
  {
    id: 'follow-up-1',
    name: 'Friendly Follow-up',
    subject: 'Following up on my previous email',
    body: `Hi {{leadName}},

I wanted to follow up on my email from {{daysAgo}} about {{topic}}.

I know you're busy, but I believe {{valueProposition}}.

If you're interested, I'd love to schedule a quick call. If not, no worries – I won't take up more of your time.

What do you think?

Best,
{{senderName}}`,
    category: 'follow_up',
    variables: ['leadName', 'daysAgo', 'topic', 'valueProposition', 'senderName'],
    createdAt: new Date().toISOString(),
    isBuiltIn: true
  },
  {
    id: 'introduction-1',
    name: 'Warm Introduction',
    subject: 'Introduction from {{referrerName}}',
    body: `Hi {{leadName}},

{{referrerName}} suggested I reach out to you about {{topic}}.

I work with {{companyName}} where we {{whatYouDo}}.

{{referrerName}} thought this might be relevant for {{leadCompany}} because {{reason}}.

Would you be open to a brief conversation to explore if there's potential value here?

Looking forward to connecting!

{{senderName}}
{{senderTitle}}`,
    category: 'introduction',
    variables: ['leadName', 'referrerName', 'topic', 'companyName', 'whatYouDo', 'leadCompany', 'reason', 'senderName', 'senderTitle'],
    createdAt: new Date().toISOString(),
    isBuiltIn: true
  },
  {
    id: 'proposal-1',
    name: 'Business Proposal',
    subject: 'Proposal: {{proposalTitle}}',
    body: `Dear {{leadName}},

Thank you for your interest in {{productService}}.

Based on our conversation, I've prepared a proposal that outlines how we can help {{companyName}} achieve {{goal}}.

Key benefits:
• {{benefit1}}
• {{benefit2}}
• {{benefit3}}

Investment: {{pricing}}
Timeline: {{timeline}}

I'd love to walk you through this proposal on a call. Are you available {{suggestedTimes}}?

Best regards,
{{senderName}}
{{senderTitle}}

P.S. {{callToAction}}`,
    category: 'proposal',
    variables: ['leadName', 'proposalTitle', 'productService', 'companyName', 'goal', 'benefit1', 'benefit2', 'benefit3', 'pricing', 'timeline', 'suggestedTimes', 'senderName', 'senderTitle', 'callToAction'],
    createdAt: new Date().toISOString(),
    isBuiltIn: true
  },
  {
    id: 'meeting-1',
    name: 'Meeting Request',
    subject: 'Meeting request: {{meetingTopic}}',
    body: `Hi {{leadName}},

I'd like to schedule a meeting to discuss {{meetingTopic}}.

This would be a great opportunity to explore {{purpose}}.

I have the following times available:
• {{timeSlot1}}
• {{timeSlot2}}
• {{timeSlot3}}

Let me know what works best for you, or feel free to suggest an alternative time.

Looking forward to speaking with you!

{{senderName}}
{{senderTitle}}`,
    category: 'meeting',
    variables: ['leadName', 'meetingTopic', 'purpose', 'timeSlot1', 'timeSlot2', 'timeSlot3', 'senderName', 'senderTitle'],
    createdAt: new Date().toISOString(),
    isBuiltIn: true
  }
];

/**
 * Get all email templates (built-in + custom)
 */
export async function getAllTemplates(): Promise<EmailTemplate[]> {
  try {
    // Get custom templates from database
    const { data: customTemplates, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching custom templates:', error);
      return BUILT_IN_TEMPLATES;
    }

    // Map database records to EmailTemplate format
    const mappedCustom: EmailTemplate[] = (customTemplates || []).map(t => ({
      id: t.id,
      name: t.name,
      subject: t.subject,
      body: t.body,
      category: t.category,
      variables: t.variables || [],
      createdAt: t.created_at,
      isBuiltIn: false
    }));

    return [...BUILT_IN_TEMPLATES, ...mappedCustom];
  } catch (err) {
    console.error('Error in getAllTemplates:', err);
    return BUILT_IN_TEMPLATES;
  }
}

/**
 * Get template by ID
 */
export async function getTemplateById(id: string): Promise<EmailTemplate | null> {
  const templates = await getAllTemplates();
  return templates.find(t => t.id === id) || null;
}

/**
 * Get templates by category
 */
export async function getTemplatesByCategory(category: EmailTemplate['category']): Promise<EmailTemplate[]> {
  const templates = await getAllTemplates();
  return templates.filter(t => t.category === category);
}

/**
 * Create custom template
 */
export async function createTemplate(
  template: Omit<EmailTemplate, 'id' | 'createdAt' | 'isBuiltIn'>
): Promise<EmailTemplate> {
  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category,
      variables: template.variables
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    subject: data.subject,
    body: data.body,
    category: data.category,
    variables: data.variables || [],
    createdAt: data.created_at,
    isBuiltIn: false
  };
}

/**
 * Update custom template
 */
export async function updateTemplate(
  id: string,
  updates: Partial<Omit<EmailTemplate, 'id' | 'createdAt' | 'isBuiltIn'>>
): Promise<void> {
  // Can't update built-in templates
  const template = await getTemplateById(id);
  if (template?.isBuiltIn) {
    throw new Error('Cannot update built-in templates');
  }

  const { error } = await supabase
    .from('email_templates')
    .update({
      name: updates.name,
      subject: updates.subject,
      body: updates.body,
      category: updates.category,
      variables: updates.variables
    })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Delete custom template
 */
export async function deleteTemplate(id: string): Promise<void> {
  // Can't delete built-in templates
  const template = await getTemplateById(id);
  if (template?.isBuiltIn) {
    throw new Error('Cannot delete built-in templates');
  }

  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Fill template with variable data
 */
export function fillTemplate(
  template: EmailTemplate,
  variables: Record<string, string>
): { subject: string; body: string } {
  let filledSubject = template.subject;
  let filledBody = template.body;

  // Replace all {{variable}} placeholders
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    filledSubject = filledSubject.replace(new RegExp(placeholder, 'g'), value);
    filledBody = filledBody.replace(new RegExp(placeholder, 'g'), value);
  });

  return {
    subject: filledSubject,
    body: filledBody
  };
}

/**
 * Smart template filling using lead data
 */
export function fillTemplateWithLead(
  template: EmailTemplate,
  lead: Lead,
  additionalVars: Record<string, string> = {}
): { subject: string; body: string } {
  const variables: Record<string, string> = {
    leadName: lead.name,
    companyName: lead.company,
    leadCompany: lead.company,
    leadEmail: lead.email,
    ...additionalVars
  };

  return fillTemplate(template, variables);
}

/**
 * Extract variables from template text
 */
export function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
}

/**
 * Validate template (check for missing variables)
 */
export function validateTemplate(template: EmailTemplate): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const subjectVars = extractVariables(template.subject);
  const bodyVars = extractVariables(template.body);
  const allVars = [...new Set([...subjectVars, ...bodyVars])];
  
  // Check if declared variables match actual variables
  const declaredSet = new Set(template.variables);
  const actualSet = new Set(allVars);
  
  allVars.forEach(v => {
    if (!declaredSet.has(v)) {
      errors.push(`Variable {{${v}}} is used but not declared`);
    }
  });
  
  template.variables.forEach(v => {
    if (!actualSet.has(v)) {
      errors.push(`Variable {{${v}}} is declared but not used`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}
