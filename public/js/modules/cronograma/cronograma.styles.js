/**
 * ARQUIVO: cronograma.styles.js
 * CATEGORIA: Cronograma › Estilos e accordion mobile
 * RESPONSABILIDADE: Injeta CSS mobile dinamicamente e controla accordion
 * DEPENDE DE: cronograma.state.js, cronograma.render.js (chama renderSemanal)
 * EXPORTA: renderStyles(), toggleBaker()
 */

Object.assign(Cronograma, {
  renderStyles() {
    if (document.getElementById('cronograma-mobile-css')) return;
    const style = document.createElement('style');
    style.id = 'cronograma-mobile-css';
    style.innerHTML = `
      .mobile-only { display: none; }
      @media (min-width: 431px) {
        .desktop-only { display: table-cell; }
        
        /* General matrix overrides */
        .matrix-container {
          background: #FAFAFA !important;
          border-radius: 24px !important;
          border: 1px solid rgba(0, 0, 0, 0.05) !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02) !important;
          padding: 8px !important;
          margin-top: 24px !important;
          overflow: hidden !important;
        }

        .matrix-table {
          border-collapse: separate !important;
          border-spacing: 6px !important;
          min-width: 1000px !important;
        }

        .matrix-table th, .matrix-table td {
          border: none !important;
          border-radius: 12px !important;
          padding: 14px !important;
          transition: all 0.2s ease !important;
        }

        /* Sticky Column (Padeiros) */
        .matrix-sticky-col {
          background: #FFFFFF !important;
          border-right: none !important;
          box-shadow: 4px 0 16px rgba(0, 0, 0, 0.01) !important;
          width: 220px !important;
          font-weight: 600 !important;
        }
        
        .matrix-table th.matrix-sticky-col {
          background: #F4F4F5 !important;
          color: #71717A !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.1em !important;
          font-weight: 700 !important;
        }

        .matrix-table th {
          background-color: #F4F4F5 !important;
          color: #27272A !important;
          font-weight: 600 !important;
          font-size: 13px !important;
        }

        /* Branch Separator Pill */
        .branch-pill-row td {
          padding: 16px 0 8px 0 !important;
        }
        .branch-pill {
          background: #18181B !important;
          color: #FFFFFF !important;
          padding: 8px 20px !important;
          border-radius: 99px !important;
          box-shadow: 0 4px 12px rgba(24, 24, 27, 0.15) !important;
          font-size: 11px !important;
          letter-spacing: 0.05em !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          transition: all 0.2s ease !important;
        }
        .branch-pill:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 6px 16px rgba(24, 24, 27, 0.2) !important;
        }

        .baker-pill-row td {
          padding: 4px 0 !important;
        }
        .baker-pill-container {
          display: flex !important;
          align-items: center !important;
        }
        .baker-pill {
          background: #E4E4E7 !important;
          color: #27272A !important;
          border-radius: 99px !important;
          padding: 6px 14px !important;
          height: 32px !important;
          font-size: 10px !important;
          box-shadow: none !important;
          border: 1px solid rgba(0, 0, 0, 0.05) !important;
        }
        .days-pill-container {
          background: #F4F4F5 !important;
          border-radius: 99px !important;
          height: 36px !important;
          padding: 2px !important;
          box-shadow: none !important;
          display: flex !important;
          gap: 4px !important;
        }
        .day-pill-item {
          flex: 1 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #71717A !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          border-radius: 99px !important;
          height: 32px !important;
          padding: 0 !important;
          transition: all 0.2s ease !important;
        }
        .day-pill-item.active {
          background: #FFFFFF !important;
          color: #18181B !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
          font-weight: 700 !important;
        }

        /* Matrix Day cells */
        .matrix-cell {
          background-color: #FFFFFF !important;
          border: 1px solid rgba(0, 0, 0, 0.02) !important;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.01) !important;
          vertical-align: top !important;
          padding: 10px !important;
          min-height: 120px !important;
        }
        .matrix-cell:hover {
          background-color: #FAFBFB !important;
          border-color: rgba(0, 0, 0, 0.05) !important;
        }
        .matrix-cell.drag-over {
          background-color: rgba(0, 102, 204, 0.04) !important;
          border-color: #0066CC !important;
          box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1) !important;
        }

        /* Refined Task Cards */
        .matrix-task-card {
          background: #FFFFFF !important;
          border: 1px solid rgba(0, 0, 0, 0.06) !important;
          border-radius: 12px !important;
          padding: 12px !important;
          margin-bottom: 10px !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(0, 0, 0, 0.01) !important;
          border-left: 4px solid #3B82F6 !important;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
          position: relative !important;
          overflow: hidden !important;
        }
        .matrix-task-card:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.06) !important;
          border-color: rgba(0, 0, 0, 0.12) !important;
        }
        .matrix-task-card.concluida {
          border-left-color: #10B981 !important;
        }
        .matrix-task-card.em_andamento {
          border-left-color: #3B82F6 !important;
        }
        .matrix-task-card.pendente {
          border-left-color: #F59E0B !important;
        }

        /* Hide reorder buttons on desktop by default, reveal on card hover */
        .matrix-reorder-btns {
          display: flex !important;
          opacity: 0 !important;
          pointer-events: none !important;
          position: absolute !important;
          top: 6px !important;
          right: 6px !important;
          gap: 2px !important;
          z-index: 10 !important;
          background: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(4px) !important;
          padding: 2px !important;
          border-radius: 6px !important;
          border: 1px solid rgba(0, 0, 0, 0.05) !important;
          transition: all 0.2s ease !important;
          margin-top: 0 !important;
          padding-top: 2px !important;
          border-top: 1px solid rgba(0, 0, 0, 0.05) !important;
          width: auto !important;
        }
        .matrix-task-card:hover .matrix-reorder-btns {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        .reorder-btn {
          width: 24px !important;
          height: 24px !important;
          background: transparent !important;
          border-radius: 4px !important;
          color: #71717A !important;
          transition: all 0.15s ease !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: none !important;
        }
        .reorder-btn:hover {
          background: #F4F4F5 !important;
          color: #18181B !important;
        }
        .reorder-btn.delete-btn:hover {
          background: #FEE2E2 !important;
          color: #EF4444 !important;
        }

        /* Task Card Inner Elements */
        .matrix-task-client {
          font-size: 13px !important;
          font-weight: 600 !important;
          color: #18181B !important;
          margin-bottom: 8px !important;
          height: auto !important;
          min-height: 36px !important;
          line-height: 1.4 !important;
        }
        .matrix-task-meta {
          font-size: 11px !important;
          color: #71717A !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
        }

        /* Add Button - Sleek Dotted Plus style */
        .matrix-add-btn {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 32px !important;
          height: 32px !important;
          margin: 12px auto 4px auto !important;
          border: 1px dashed #D4D4D8 !important;
          background-color: transparent !important;
          color: #71717A !important;
          border-radius: 50% !important;
          cursor: pointer !important;
          box-shadow: none !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .matrix-add-btn:hover {
          background-color: #F4F4F5 !important;
          border-color: #18181B !important;
          color: #18181B !important;
          transform: scale(1.08) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
        }

        /* Segmented Control macOS style */
        .segmented-control {
          background: rgba(120, 120, 128, 0.08) !important;
          border-radius: 10px !important;
          padding: 2px !important;
          height: 36px !important;
          display: inline-flex !important;
          align-items: center !important;
          border: 1px solid rgba(0, 0, 0, 0.02) !important;
        }
        .segmented-slider {
          background-color: #FFFFFF !important;
          border-radius: 8px !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04) !important;
        }
        .segmented-item {
          font-size: 13px !important;
          font-weight: 500 !important;
          color: #71717A !important;
          border-radius: 8px !important;
          height: 32px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 20px !important;
        }
        .segmented-item.active {
          color: #18181B !important;
          font-weight: 600 !important;
        }

        /* Action Buttons */
        .cronograma-actions {
          display: flex !important;
          gap: 8px !important;
        }
        .cronograma-actions .btn {
          font-size: 13px !important;
          font-weight: 600 !important;
          border-radius: 99px !important;
          padding: 8px 18px !important;
          height: 36px !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          border: 1px solid rgba(0,0,0,0.05) !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02) !important;
        }
        .cronograma-actions .btn:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
        }
        .cronograma-actions .btn-primary {
          background-color: #18181B !important;
          color: #FFFFFF !important;
          border: none !important;
        }
        .cronograma-actions .btn-primary:hover {
          background-color: #27272A !important;
          box-shadow: 0 4px 14px rgba(24,24,27,0.2) !important;
        }

        /* Week Navigation elegant float container */
        .week-nav {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          background: #FFFFFF !important;
          border-radius: 20px !important;
          border: 1px solid rgba(0, 0, 0, 0.05) !important;
          padding: 10px 20px !important;
          margin-bottom: 24px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02) !important;
          width: 100% !important;
          max-width: 600px !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        .week-nav h3 {
          font-size: 16px !important;
          font-weight: 700 !important;
          color: #18181B !important;
          letter-spacing: -0.02em !important;
        }
        .week-nav .btn-icon {
          width: 32px !important;
          height: 32px !important;
          background: #F4F4F5 !important;
          border-radius: 50% !important;
          border: none !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #71717A !important;
          transition: all 0.2s ease !important;
        }
        .week-nav .btn-icon:hover {
          background: #E4E4E7 !important;
          color: #18181B !important;
          transform: scale(1.05) !important;
        }

        /* Monthly View Month Cards Redesign */
        .month-grid {
          display: grid !important;
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 20px !important;
          margin-top: 24px !important;
        }
        .month-card {
          background: #FFFFFF !important;
          border: 1px solid rgba(0,0,0,0.06) !important;
          border-radius: 20px !important;
          padding: 24px !important;
          min-height: 140px !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.01) !important;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          position: relative !important;
        }
        .month-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.06) !important;
          border-color: rgba(0,0,0,0.12) !important;
        }
        .month-abbr {
          color: #18181B !important;
          font-size: 36px !important;
          font-weight: 800 !important;
          letter-spacing: -0.04em !important;
          font-family: inherit !important;
        }
        .month-subtitle {
          color: #71717A !important;
          font-size: 13px !important;
          font-weight: 500 !important;
        }
        .month-progress-wrapper {
          width: 100% !important;
          margin-top: 12px !important;
        }
        .month-meta-text {
          font-size: 13px !important;
          color: #18181B !important;
          font-weight: 700 !important;
        }
        .month-card-blob {
          background-color: rgba(37, 99, 235, 0.03) !important;
          border: 4px dashed rgba(37, 99, 235, 0.08) !important;
          bottom: -30px !important;
          right: -30px !important;
          width: 100px !important;
          height: 100px !important;
        }

        /* Drag target line overrides */
        .drag-target-top {
          border-top: 4px solid #0066CC !important;
        }

        /* Move/Duplicate Modal Overrides */
        .md-modal-container {
          background: #FFFFFF !important;
          border-radius: 20px !important;
          box-shadow: 0 24px 60px rgba(0,0,0,0.1) !important;
          border: 1px solid rgba(0,0,0,0.05) !important;
          padding: 28px !important;
        }
        .md-modal-divider {
          background: rgba(0,0,0,0.05) !important;
        }
        .md-info-card {
          background: #F4F4F5 !important;
          border: 1px solid rgba(0,0,0,0.05) !important;
          border-radius: 12px !important;
          padding: 14px 16px !important;
        }
        .md-info-icon {
          background: #FFFFFF !important;
          border: 1px solid rgba(0,0,0,0.05) !important;
        }
        .md-info-date-badge {
          background: rgba(0, 102, 204, 0.08) !important;
          color: #0066CC !important;
        }
        .md-action-card {
          border: 1px solid rgba(0,0,0,0.08) !important;
          border-radius: 12px !important;
        }
        .md-action-card.mover.selected {
          background: rgba(37, 99, 235, 0.05) !important;
          border: 2px solid #2563EB !important;
        }
        .md-action-card.duplicar.selected {
          background: rgba(16, 185, 129, 0.05) !important;
          border: 2px solid #10B981 !important;
        }
        .md-action-card.mover .md-action-icon {
          background: rgba(37, 99, 235, 0.1) !important;
          color: #2563EB !important;
        }
        .md-action-card.duplicar .md-action-icon {
          background: rgba(16, 185, 129, 0.1) !important;
          color: #10B981 !important;
        }
        .md-btn-confirm {
          background: #18181B !important;
          border-radius: 99px !important;
          color: #FFFFFF !important;
          border: none !important;
        }
        .md-btn-confirm:hover {
          background: #27272A !important;
        }
        .md-btn-cancel {
          background: transparent !important;
          color: #71717A !important;
          border: 1px solid rgba(0,0,0,0.05) !important;
          border-radius: 99px !important;
          font-weight: 600 !important;
        }

        /* Agenda Table overrides */
        .agenda-table {
          border-collapse: separate !important;
          border-spacing: 2px !important;
        }
        .agenda-table th {
          background-color: #18181B !important;
          color: #FFFFFF !important;
          border-bottom: none !important;
          border-radius: 6px !important;
          font-weight: 700 !important;
        }
        .agenda-table td {
          border-bottom: none !important;
          border-radius: 6px !important;
          font-size: 13px !important;
          transition: all 0.2s ease !important;
        }
        .agenda-table tr:nth-child(even) td {
          background-color: #F4F4F5 !important;
        }
        .agenda-table tr:nth-child(odd) td {
          background-color: #FFFFFF !important;
          border: 1px solid rgba(0, 0, 0, 0.03) !important;
        }
        .agenda-table td.col-padeiro {
          background-color: #F4F4F5 !important;
          font-weight: 700 !important;
          color: #18181B !important;
          border-right: none !important;
        }
        .agenda-btn-close {
          background-color: #18181B !important;
          color: #FFFFFF !important;
          border: none !important;
          padding: 10px 20px !important;
          border-radius: 99px !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }
        .agenda-btn-close:hover {
          background-color: #27272A !important;
          transform: translateY(-1px) !important;
        }
      }
      @media (max-width: 430px) {
        .cronograma-header { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
        
        .segmented-control {
          position: relative !important;
          width: 100% !important;
          margin-bottom: 8px !important;
          background: rgba(120, 120, 128, 0.12) !important;
          border-radius: 9px !important;
          padding: 2px !important;
          height: 38px !important;
          box-shadow: none !important;
          display: flex !important;
          align-items: center !important;
        }
        .segmented-slider {
          background-color: #ffffff !important;
          border-radius: 7px !important;
          height: calc(100% - 4px) !important;
          top: 2px !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.12) !important;
          z-index: 1 !important;
        }
        .segmented-item {
          position: relative !important;
          z-index: 2 !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          border-radius: 7px !important;
          color: var(--text-secondary) !important;
          background: transparent !important;
          border: none !important;
          transition: color 0.2s ease !important;
        }
        .segmented-item.active {
          color: var(--text-primary) !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .cronograma-actions { display: flex !important; flex-wrap: wrap !important; gap: 8px !important; }
        .cronograma-actions .btn { flex: 1 !important; white-space: nowrap !important; font-size: 12px !important; padding: 10px !important; }
        
        .week-nav {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          padding: 12px 16px !important;
          background: #FFFFFF !important;
          border-radius: 14px !important;
          border: 1px solid var(--separator) !important;
          margin-bottom: 16px !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.02) !important;
        }
        .week-nav h3 {
          font-size: 17px !important;
          font-weight: 700 !important;
          letter-spacing: -0.4px !important;
          color: var(--text-primary) !important;
          margin: 0 !important;
        }
        
        /* Accordion Logic */
        .matrix-container { 
          background: transparent !important; 
          border: none !important; 
          box-shadow: none !important; 
          overflow-x: hidden !important; 
          width: 100% !important;
          min-width: 0 !important;
        }
        .matrix-table { 
          display: block !important; 
          min-width: 0 !important; 
          width: 100% !important;
          border: none !important;
        }
        .matrix-table thead { display: none !important; }
        .matrix-table tbody { display: flex !important; flex-direction: column !important; gap: 12px !important; width: 100% !important; }
        
        .baker-row-mobile { 
          display: flex !important; 
          flex-direction: column !important; 
          background: #ffffff !important; 
          border-radius: 14px !important; 
          border: 1px solid var(--separator) !important;
          margin-bottom: 10px !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02) !important;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        .baker-header-mobile {
          padding: 14px 16px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          background: #ffffff !important;
          cursor: pointer !important;
          transition: background-color 0.2s !important;
        }
        .baker-header-mobile:active {
          background-color: rgba(0, 0, 0, 0.03) !important;
        }
        .baker-row-mobile.expanded .baker-header-mobile { border-bottom-color: var(--separator) !important; }
        
        .days-scroll-mobile {
          display: none !important;
          overflow-x: auto !important;
          padding: 16px !important;
          gap: 12px !important;
          background: #F2F2F7 !important; /* iOS secondary system background */
          -webkit-overflow-scrolling: touch !important;
          border-top: 1px solid var(--separator) !important;
        }
        .baker-row-mobile.expanded .days-scroll-mobile { display: flex !important; }
        
        .day-column-mobile {
          min-width: 200px !important;
          width: 200px !important;
          max-width: 200px !important;
          flex-shrink: 0 !important;
          background: #ffffff !important;
          border-radius: 16px !important;
          padding: 12px !important;
          border: 1px solid var(--separator) !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02) !important;
          display: flex !important;
          flex-direction: column !important;
        }
        
        .day-label-mobile {
          font-size: 12px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          color: var(--text-secondary) !important;
          margin-bottom: 10px !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
        }
        
        .matrix-task-card {
          border-radius: 12px !important;
          padding: 12px !important;
          margin-bottom: 8px !important;
          border-left-width: 4px !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02) !important;
          position: relative !important;
          background-color: #ffffff !important;
          transition: transform 0.1s ease, box-shadow 0.15s ease, background-color 0.2s ease !important;
        }

        .matrix-task-card.is-dragging {
          z-index: 10000 !important;
          pointer-events: none !important;
          box-shadow: 0 16px 32px rgba(0, 0, 0, 0.15) !important;
          border-color: var(--primary) !important;
          opacity: 0.9 !important;
        }

        .day-column-mobile.drag-over {
          border-color: var(--primary) !important;
          background-color: rgba(30, 75, 255, 0.05) !important;
          transform: scale(1.02) !important;
        }
        
        .matrix-task-card.drag-target-top {
          border-top: 3px solid var(--primary) !important;
          transform: translateY(4px) !important;
        }
        
        .matrix-reorder-btns {
          opacity: 1 !important;
          position: static !important;
          transform: none !important;
          display: flex !important;
          flex-direction: row !important;
          justify-content: flex-end !important;
          gap: 6px !important;
          margin-top: 10px !important;
          padding-top: 8px !important;
          border-top: 1px dashed var(--separator) !important;
          width: 100% !important;
        }
        
        .reorder-btn {
          width: 32px !important;
          height: 32px !important;
          background-color: #F2F2F7 !important;
          border-radius: 8px !important;
          color: var(--text-secondary) !important;
          border: none !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        
        .reorder-btn.delete-btn {
          background-color: rgba(255, 59, 48, 0.1) !important;
          color: #FF3B30 !important;
          margin-left: auto !important;
        }

        .matrix-task-client {
          height: auto !important;
          min-height: unset !important;
          max-height: unset !important;
          font-size: 13px !important;
          line-height: 1.4 !important;
          margin-bottom: 6px !important;
        }

        .matrix-add-btn { 
          width: 100% !important; 
          height: 40px !important; 
          margin-top: 8px !important;
          border-radius: 10px !important;
          border: 1px dashed var(--separator) !important;
          background: #ffffff !important;
          color: var(--primary) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          cursor: pointer !important;
          transition: background-color 0.2s !important;
        }
        .matrix-add-btn:active {
          background-color: rgba(0,0,0,0.03) !important;
        }
        
        .desktop-only { display: none !important; }
        .mobile-only { display: table-cell !important; }
        
        /* Adjust pills on mobile */
        .branch-pill-row { background: transparent !important; margin: 8px 0 !important; border: none !important; }
        .branch-pill { width: 100% !important; justify-content: center !important; border-radius: 12px !important; height: 32px !important; }
        .baker-pill-container, .days-pill-container { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  },

  toggleBaker(id) {
    if (this.expandedBakers.has(id)) this.expandedBakers.delete(id);
    else this.expandedBakers.add(id);
    this.renderSemanal();
  },
});
