const KEY = "dahomey_rpg_save_v1", SKEY = "dahomey_rpg_settings_v1";
export const hasSave = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };
export const loadSave = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
export const writeSave = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; } };
export const clearSave = () => { try { localStorage.removeItem(KEY); } catch (e) {} };
export const loadSettings = () => { try { return Object.assign({ music: 50, sfx: 80, shadow: 1, sens: 100 }, JSON.parse(localStorage.getItem(SKEY)) || {}); } catch (e) { return { music: 50, sfx: 80, shadow: 1, sens: 100 }; } };
export const writeSettings = (s) => { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {} };
