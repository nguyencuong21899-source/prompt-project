import { validLinks } from './links.js';
// Reject malformed remote/cache data before it reaches rendering or the clipboard.
export function validCatalog(value) {
  if (!value || value.schemaVersion !== 1) return false;
  if(value.links!==undefined&&!validLinks(value.links))return false;
  const named = items => Array.isArray(items) && items.every(item =>
    item && typeof item.id === 'string' && item.id && typeof item.name === 'string') &&
    new Set(items.map(item => item.id)).size === items.length;
  if (!named(value.departments) || !named(value.categories) || !Array.isArray(value.prompts)) return false;
  const ids = new Set();
  return value.prompts.every(p => {
    if (!p || !['id','title','description','content','departmentId','categoryId'].every(key => typeof p[key] === 'string')) return false;
    if (!p.id || !p.title.trim() || !p.content.trim() || ids.has(p.id)) return false;
    ids.add(p.id);
    return value.departments.some(d => d.id === p.departmentId) && value.categories.some(c => c.id === p.categoryId) &&
      (p.tags === undefined || (Array.isArray(p.tags) && p.tags.every(t => typeof t === 'string'))) &&
      (p.variables === undefined || (Array.isArray(p.variables) && p.variables.every(v => v &&
        typeof v.name === 'string' && /^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(v.name) &&
        (v.label === undefined || typeof v.label === 'string'))));
  });
}
