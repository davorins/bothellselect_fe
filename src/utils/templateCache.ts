import { emailTemplateService } from '../services/emailTemplateService';
import { EmailTemplate } from '../types/types';

class TemplateCache {
  private static cache = new Map<string, EmailTemplate>();
  private static lastUpdated = 0;
  private static cacheDuration = 1000 * 60 * 30; // 30 minutes

  static async getTemplate(title: string): Promise<EmailTemplate | undefined> {
    try {
      await this.checkCache();
      return this.cache.get(title);
    } catch (error) {
      console.error('Cache error:', error);
      return undefined;
    }
  }

  static async getTemplatesByCategory(
    category: string
  ): Promise<EmailTemplate[]> {
    try {
      await this.checkCache();
      return Array.from(this.cache.values()).filter(
        (t: EmailTemplate) => t.category === category && t.status
      );
    } catch (error) {
      console.error('Cache error:', error);
      return [];
    }
  }

  private static async checkCache(): Promise<void> {
    try {
      if (
        Date.now() - this.lastUpdated > this.cacheDuration ||
        this.cache.size === 0
      ) {
        await this.refreshCache();
      }
    } catch (error) {
      console.error('Cache check failed:', error);
      throw error;
    }
  }

  private static async refreshCache(): Promise<void> {
    try {
      const templates: EmailTemplate[] =
        await emailTemplateService.getAllActiveTemplates();
      this.cache.clear();
      templates.forEach((t: EmailTemplate) => this.cache.set(t._id, t));
      this.lastUpdated = Date.now();
    } catch (error) {
      console.error('Cache refresh failed:', error);
      throw error;
    }
  }
}

export default TemplateCache;
