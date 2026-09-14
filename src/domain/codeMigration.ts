/**
 * 工項碼遷移（自我修復舊案件）。
 * seed 的工項碼歷經幾次調整：暗管配管移除（改指明管手足）、工項碼語意化重編。
 * 使用者早先存於瀏覽器 IndexedDB 的案件，其明細列可能仍引用舊碼，載入時會對不到主檔而「不見」。
 * 這裡在載入案件時把已知舊碼映射到現行碼，讓舊案件自動修復；現行碼不在表中則原樣保留（冪等）。
 */
import migration from './codeMigration.json';

const MAP = migration as Record<string, string>;

/** 單一工項碼遷移：舊碼→現行碼；未知碼原樣回傳。 */
export function migrateCode(code: string): string {
  return MAP[code] ?? code;
}
