import { emailTemplateService } from '../services/emailTemplateService';
import { EmailTemplate } from '../types/types';

class TemplateCache {
  private static cache = new Map<string, EmailTemplate>();
  private static lastUpdated = 0;
  private static cacheDuration = 1000 * 60 * 30; // 30 minutes

  static async getTemplate(title: string): Promise<EmailTemplate | undefined> {
    await this.checkCache();
    return this.cache.get(title);
  }

  static async getTemplatesByCategory(
    category: string
  ): Promise<EmailTemplate[]> {
    await this.checkCache();
    return Array.from(this.cache.values()).filter(
      (t: EmailTemplate) => t.category === category && t.status
    );
  }

  private static async checkCache() {
    if (
      Date.now() - this.lastUpdated > this.cacheDuration ||
      this.cache.size === 0
    ) {
      await this.refreshCache();
    }
  }

  private static async refreshCache() {
    const templates: EmailTemplate[] =
      await emailTemplateService.getAllActiveTemplates();
    this.cache.clear();
    templates.forEach((t: EmailTemplate) => this.cache.set(t.title, t));
    this.lastUpdated = Date.now();
  }
}

export default TemplateCache;
