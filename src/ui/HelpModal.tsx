interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box help-modal" onClick={(event) => event.stopPropagation()}>
        <h2>使用說明與資料安全</h2>
        <div className="modal-body">
          <h3>基本流程</h3>
          <ol>
            <li>建立或開啟案件，確認日工價、折數與系統工率檔位。</li>
            <li>在「系統明細」輸入數量，至「合理性檢核」處理警示。</li>
            <li>按「儲存」寫入這台瀏覽器，再按「匯出完整備份」保存 JSON 檔。</li>
          </ol>

          <h3>備份與換電腦</h3>
          <p>
            案件只存在目前瀏覽器的 IndexedDB，不會自動上傳或同步。建議至少每 7 天、重要修改後及清除瀏覽器資料前
            匯出完整備份；換瀏覽器、換 profile 或換電腦時，請從案件清單匯入 JSON 備份。
          </p>

          <h3>發生錯誤時</h3>
          <ol>
            <li>先按「重試」，不要清除瀏覽器資料。</li>
            <li>若其他分頁或舊版本仍能開啟，先逐案匯出完整備份。</li>
            <li>關閉其他仍開啟本系統的舊分頁，再重試。</li>
            <li>只有已有備份或確定放棄資料時，才重建本機資料庫。</li>
          </ol>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="primary" onClick={onClose}>關閉</button>
        </div>
      </div>
    </div>
  );
}
