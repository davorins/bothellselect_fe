// constants/emailStyles.ts

import {
  EmailColorPreset,
  EmailLayoutStyle,
} from '../../types/emailBuilder.types';

export const COLOR_PRESETS: EmailColorPreset[] = [
  {
    name: 'Ocean Blue',
    primaryColor: '#4A90D9',
    backgroundColor: '#F0F7FF',
    headerBg: '#1E3A6F',
    ctaColor: '#4A90D9',
    textColor: '#1A2332',
    accentColor: '#6CB4EE',
  },
  {
    name: 'Forest Green',
    primaryColor: '#2D7D46',
    backgroundColor: '#F0F7F0',
    headerBg: '#1A4A2A',
    ctaColor: '#2D7D46',
    textColor: '#1A2A1A',
    accentColor: '#5CA87A',
  },
  {
    name: 'Sunset Orange',
    primaryColor: '#E8751A',
    backgroundColor: '#FFF5F0',
    headerBg: '#7A3A10',
    ctaColor: '#E8751A',
    textColor: '#3A1A0A',
    accentColor: '#F5A05A',
  },
  {
    name: 'Royal Purple',
    primaryColor: '#6C3A9A',
    backgroundColor: '#F5F0FF',
    headerBg: '#3A1A5A',
    ctaColor: '#6C3A9A',
    textColor: '#2A1A3A',
    accentColor: '#9A6ACA',
  },
  {
    name: 'Rose Pink',
    primaryColor: '#D94A7A',
    backgroundColor: '#FFF0F5',
    headerBg: '#7A1A3A',
    ctaColor: '#D94A7A',
    textColor: '#3A1A2A',
    accentColor: '#F07A9A',
  },
  {
    name: 'Slate Gray',
    primaryColor: '#4A5A6A',
    backgroundColor: '#F5F7F8',
    headerBg: '#1A2A3A',
    ctaColor: '#4A5A6A',
    textColor: '#1A2A3A',
    accentColor: '#7A8A9A',
  },
  {
    name: 'Modern Dark',
    primaryColor: '#6C7A8A',
    backgroundColor: '#1A1A1A',
    headerBg: '#0A0A0A',
    ctaColor: '#8A9AAA',
    textColor: '#EAEAEA',
    accentColor: '#4A5A6A',
  },
  {
    name: 'Clean White',
    primaryColor: '#506EE4',
    backgroundColor: '#FFFFFF',
    headerBg: '#F8F9FA',
    ctaColor: '#506EE4',
    textColor: '#1A2332',
    accentColor: '#8A9AAA',
  },
];

export const LAYOUT_PREVIEWS: Record<
  EmailLayoutStyle,
  { label: string; description: string; icon: string }
> = {
  minimal: {
    label: 'Minimal',
    description: 'Clean, text-first design with subtle elegance',
    icon: '📝',
  },
  'hero-banner': {
    label: 'Hero Banner',
    description: 'Bold image header with overlay text',
    icon: '🖼️',
  },
  'card-centered': {
    label: 'Card Center',
    description: 'Floating card design with shadow effect',
    icon: '📇',
  },
  'sidebar-accent': {
    label: 'Sidebar Accent',
    description: 'Colorful sidebar with content emphasis',
    icon: '📑',
  },
  'full-bg': {
    label: 'Full Background',
    description: 'Immersive full-width background image',
    icon: '🌅',
  },
  newsletter: {
    label: 'Newsletter',
    description: 'Classic newsletter with date and sections',
    icon: '📰',
  },
  'split-column': {
    label: 'Split Column',
    description: '50/50 image and text layout',
    icon: '📐',
  },
  'feature-grid': {
    label: 'Feature Grid',
    description: 'Grid layout for features or products',
    icon: '📊',
  },
  'modern-dark': {
    label: 'Modern Dark',
    description: 'Dark theme with modern styling',
    icon: '🌙',
  },
};

export const FONT_PRESETS = [
  { label: 'System Default', value: 'system' },
  { label: 'Georgia (Serif)', value: 'georgia' },
  { label: 'Verdana (Sans)', value: 'verdana' },
  { label: 'Tahoma', value: 'tahoma' },
  { label: 'Trebuchet MS', value: 'trebuchet' },
  { label: 'Courier New', value: 'courier' },
  { label: 'Inter', value: 'inter' },
  { label: 'Roboto', value: 'roboto' },
  { label: 'Open Sans', value: 'open-sans' },
  { label: 'Lato', value: 'lato' },
];
