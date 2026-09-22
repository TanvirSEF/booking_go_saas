import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { CustomField, type ICustomFieldDocument } from '@/models/CustomField';
import type { CustomFieldsValidationResult } from '@/types/custom-field';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Dynamically validates and sanitizes customer intake custom fields against the
 * tenant's configured CustomField collection rules in MongoDB Atlas.
 *
 * Enforces:
 * 1. Required field checks (rejection on missing / empty value).
 * 2. Strict type verification (text, number, email, date, select, textarea, radio, checkbox).
 * 3. Choice whitelisting for select, radio, and multi-checkbox options.
 * 4. Anti-pollution security: discards unconfigured / malicious injected keys.
 * 5. Dual-key storage: stores values accessible by both field label and field ID.
 */
export async function validateAndSanitizeCustomFields(
  businessId: string | Types.ObjectId,
  rawInput?: Record<string, unknown>
): Promise<CustomFieldsValidationResult> {
  if (!businessId) {
    return { success: true, data: {} };
  }

  await connectToDatabase();

  const targetBusinessId =
    typeof businessId === 'string'
      ? new Types.ObjectId(businessId)
      : businessId;

  const configuredFields: ICustomFieldDocument[] = await CustomField.find({
    businessId: targetBusinessId,
  })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  if (!configuredFields || configuredFields.length === 0) {
    return { success: true, data: {} };
  }

  const fieldErrors: Record<string, string> = {};
  const sanitized: Record<string, unknown> = {};

  // Build indexed map from raw input for flexible lookup (by ID or Label)
  const inputMap = new Map<string, unknown>();
  if (rawInput && typeof rawInput === 'object') {
    for (const [key, value] of Object.entries(rawInput)) {
      if (key && key.trim().length > 0) {
        inputMap.set(key.trim(), value);
        inputMap.set(key.toLowerCase().trim(), value);
      }
    }
  }

  for (const field of configuredFields) {
    const fieldId = field._id.toString();
    const fieldLabel = field.label.trim();
    const fieldLabelLower = fieldLabel.toLowerCase();

    // Lookup value by field ID first, then by field label
    let val: unknown = undefined;
    if (inputMap.has(fieldId)) {
      val = inputMap.get(fieldId);
    } else if (inputMap.has(fieldLabel)) {
      val = inputMap.get(fieldLabel);
    } else if (inputMap.has(fieldLabelLower)) {
      val = inputMap.get(fieldLabelLower);
    }

    const isEmpty =
      val === undefined ||
      val === null ||
      (typeof val === 'string' && val.trim() === '') ||
      (Array.isArray(val) && val.length === 0);

    // 1. Required Check
    if (field.isRequired && isEmpty) {
      fieldErrors[fieldLabel] = `${fieldLabel} is required.`;
      continue;
    }

    // Optional field and empty -> skip type validation
    if (isEmpty) {
      continue;
    }

    // 2. Type-Specific Validation & Sanitization
    let sanitizedVal: unknown = undefined;

    switch (field.type) {
      case 'text':
      case 'textarea': {
        if (typeof val !== 'string' && typeof val !== 'number') {
          fieldErrors[fieldLabel] = `${fieldLabel} must be a valid text value.`;
          break;
        }
        const str = String(val).trim();
        if (str.length > 2000) {
          fieldErrors[fieldLabel] = `${fieldLabel} must not exceed 2000 characters.`;
          break;
        }
        sanitizedVal = str;
        break;
      }

      case 'number': {
        if (typeof val === 'number' && !isNaN(val)) {
          sanitizedVal = val;
        } else if (typeof val === 'string' && val.trim() !== '') {
          const num = Number(val.trim());
          if (isNaN(num)) {
            fieldErrors[fieldLabel] = `${fieldLabel} must be a valid number.`;
          } else {
            sanitizedVal = num;
          }
        } else {
          fieldErrors[fieldLabel] = `${fieldLabel} must be a valid number.`;
        }
        break;
      }

      case 'email': {
        const emailStr = String(val).trim();
        if (!EMAIL_REGEX.test(emailStr)) {
          fieldErrors[fieldLabel] = `${fieldLabel} must be a valid email address.`;
          break;
        }
        sanitizedVal = emailStr.toLowerCase();
        break;
      }

      case 'date': {
        const dateStr = String(val).trim();
        const isValidFormat = DATE_REGEX.test(dateStr);
        const parsedDate = new Date(dateStr);
        if (!isValidFormat && isNaN(parsedDate.getTime())) {
          fieldErrors[fieldLabel] = `${fieldLabel} must be a valid date.`;
          break;
        }
        sanitizedVal = dateStr;
        break;
      }

      case 'select':
      case 'radio': {
        const choice = String(val).trim();
        if (field.options && field.options.length > 0) {
          const matchedOption = field.options.find(
            (opt) => opt.trim().toLowerCase() === choice.toLowerCase()
          );
          if (!matchedOption) {
            fieldErrors[fieldLabel] = `${fieldLabel} contains an invalid selection.`;
            break;
          }
          sanitizedVal = matchedOption;
        } else {
          sanitizedVal = choice;
        }
        break;
      }

      case 'checkbox': {
        if (Array.isArray(val)) {
          const selectedItems = val.map((item) => String(item).trim()).filter(Boolean);
          if (field.options && field.options.length > 0) {
            const validOptionsLower = field.options.map((opt) => opt.trim().toLowerCase());
            const hasInvalidOption = selectedItems.some(
              (item) => !validOptionsLower.includes(item.toLowerCase())
            );
            if (hasInvalidOption) {
              fieldErrors[fieldLabel] = `${fieldLabel} contains invalid options.`;
              break;
            }
          }
          sanitizedVal = selectedItems;
        } else if (typeof val === 'boolean') {
          sanitizedVal = val;
        } else if (typeof val === 'string') {
          const lower = val.trim().toLowerCase();
          if (['true', 'on', '1', 'yes'].includes(lower)) {
            sanitizedVal = true;
          } else if (['false', 'off', '0', 'no'].includes(lower)) {
            sanitizedVal = false;
          } else if (field.options && field.options.length > 0) {
            // Comma separated string of options
            const parts = val.split(',').map((p) => p.trim()).filter(Boolean);
            const validOptionsLower = field.options.map((opt) => opt.trim().toLowerCase());
            const hasInvalid = parts.some((p) => !validOptionsLower.includes(p.toLowerCase()));
            if (hasInvalid) {
              fieldErrors[fieldLabel] = `${fieldLabel} contains invalid options.`;
              break;
            }
            sanitizedVal = parts;
          } else {
            sanitizedVal = val.trim();
          }
        }
        break;
      }

      default:
        sanitizedVal = typeof val === 'string' ? val.trim() : val;
    }

    if (sanitizedVal !== undefined && !fieldErrors[fieldLabel]) {
      // Dual-key storage: accessible by both Label and ID
      sanitized[fieldLabel] = sanitizedVal;
      sanitized[fieldId] = sanitizedVal;
    }
  }

  const errorKeys = Object.keys(fieldErrors);
  if (errorKeys.length > 0) {
    const firstErrorMessage = fieldErrors[errorKeys[0]];
    return {
      success: false,
      error: firstErrorMessage,
      fieldErrors,
      data: sanitized,
    };
  }

  return {
    success: true,
    data: sanitized,
  };
}

/**
 * Formats custom field responses into clean text for transactional email notifications.
 * Filters out MongoDB ObjectId keys so only human-readable labels are rendered.
 */
export function formatCustomFieldsForEmail(
  customFields?: Record<string, unknown>
): string {
  if (!customFields || typeof customFields !== 'object') {
    return 'None';
  }

  const lines: string[] = [];

  for (const [key, value] of Object.entries(customFields)) {
    // Skip 24-character hexadecimal ObjectId keys
    if (/^[0-9a-fA-F]{24}$/.test(key)) {
      continue;
    }

    if (value === undefined || value === null || value === '') {
      continue;
    }

    let displayVal = '';
    if (Array.isArray(value)) {
      displayVal = value.join(', ');
    } else if (typeof value === 'boolean') {
      displayVal = value ? 'Yes' : 'No';
    } else {
      displayVal = String(value);
    }

    lines.push(`• ${key}: ${displayVal}`);
  }

  return lines.length > 0 ? lines.join('\n') : 'None';
}
