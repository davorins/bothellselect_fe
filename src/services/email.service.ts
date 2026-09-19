import { emailTemplateService } from './emailTemplateService';
import TemplateCache from '../utils/templateCache';

export class EmailService {
  static async sendWelcomeEmail(parentId: string, playerId: string) {
    const template = await TemplateCache.getTemplate('Welcome');
    if (!template) {
      throw new Error('Welcome template not found');
    }
    if (!template._id) {
      throw new Error('Welcome template is missing _id');
    }

    return emailTemplateService.sendTemplate({
      templateId: template._id,
      parentId,
      playerId,
    });
  }

  static async sendTemplateEmail(
    templateTitle: string,
    parentId: string,
    playerId: string,
  ) {
    const template = await TemplateCache.getTemplate(templateTitle);
    if (!template) {
      throw new Error(`Template "${templateTitle}" not found`);
    }
    if (!template._id) {
      throw new Error(`Template "${templateTitle}" is missing _id`);
    }

    return emailTemplateService.sendTemplate({
      templateId: template._id,
      parentId,
      playerId,
    });
  }
}
