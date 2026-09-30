/**
 * ARQUIVO: cronograma.styles.js
 * CATEGORIA: Cronograma › Estilos e accordion mobile
 * RESPONSABILIDADE: Injeta CSS mobile dinamicamente e controla accordion
 * DEPENDE DE: cronograma.state.js, cronograma.render.js (chama renderSemanal)
 * EXPORTA: renderStyles(), toggleBaker()
 */

Object.assign(Cronograma, {
  renderStyles() {
    const existing = document.getElementById('cronograma-mobile-css');
    if (existing) existing.remove();
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
        .cronograma-header .segmented-control {
          position: relative !important;
          background: rgba(120, 120, 128, 0.08) !important;
          border-radius: 10px !important;
          padding: 2px !important;
          height: 36px !important;
          display: inline-flex !important;
          align-items: center !important;
          border: 1px solid rgba(0, 0, 0, 0.02) !important;
          width: 360px !important;
        }
        .cronograma-header .segmented-slider {
           position: absolute !important;
           background-color: #ffffff !important;
           border-radius: 7px !important;
           height: calc(100% - 4px) !important;
           top: 2px !important;
           left: 2px !important;
           width: calc((100% - 4px) / 3) !important;
           box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.12) !important;
           z-index: 1 !important;
           transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
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
          padding: 0 !important;
          flex: 1 !important;
          min-width: 0 !important;
          cursor: pointer !important;
          z-index: 2 !important;
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

        body.tf-page-active .app-layout {
          background: linear-gradient(135deg, #1E4BFF 0%, #5E82FF 100%) !important;
        }

        body.tf-page-active .hig-sidebar {
          background: transparent !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        body.tf-page-active .main-content {
          background: transparent !important;
        }

        #page-container.tf-page-active {
          background: transparent !important;
          padding: 32px !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        body.tf-page-active .ios-desktop-header {
          display: none !important;
        }

        #page-container.tf-page-active .cronograma-actions {
          display: none !important;
        }

        #page-container.tf-page-active .segmented-control {
          background: rgba(255, 255, 255, 0.15) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
        }

        #page-container.tf-page-active .segmented-control .segmented-item {
          color: rgba(255, 255, 255, 0.8) !important;
        }

        #page-container.tf-page-active .segmented-control .segmented-item.active {
          color: #1E4BFF !important;
          font-weight: 700 !important;
        }


        .tf-container {
          background: transparent !important;
          border-radius: 0 !important;
          padding: 0 !important;
          color: #FFFFFF !important;
          font-family: 'Outfit', -apple-system, sans-serif !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 28px !important;
          box-shadow: none !important;
          margin: 0 !important;
          min-height: auto !important;
        }
        
        .tf-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
        }
        
        .tf-brand {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
        }
        
        .tf-logo-circle {
          width: 38px !important;
          height: 38px !important;
          border: 2px solid #FFFFFF !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          position: relative !important;
        }
        
        .tf-logo-circle::after {
          content: '' !important;
          width: 2px !important;
          height: 38px !important;
          background: #FFFFFF !important;
          position: absolute !important;
        }
        
        .tf-logo-text {
          font-size: 22px !important;
          font-weight: 700 !important;
          letter-spacing: -0.03em !important;
        }

        .tf-controls {
          display: flex !important;
          align-items: center !important;
          gap: 20px !important;
        }

        .tf-top-segmented {
          background: rgba(0, 0, 0, 0.2) !important;
          border-radius: 99px !important;
          padding: 3px !important;
          display: flex !important;
          gap: 2px !important;
        }
        
        .tf-top-seg-btn {
          border: none !important;
          background: transparent !important;
          color: rgba(255, 255, 255, 0.7) !important;
          padding: 6px 18px !important;
          border-radius: 99px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }
        
        .tf-top-seg-btn.active {
          background: #11216B !important;
          color: #FFFFFF !important;
        }

        .tf-theme-pill {
          background: #FFFFFF !important;
          color: #1E293B !important;
          border-radius: 99px !important;
          padding: 4px 12px !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          font-size: 12px !important;
          font-weight: 700 !important;
        }

        .tf-top-stats {
          display: flex !important;
          gap: 24px !important;
          align-items: center !important;
        }

        .tf-stat-item {
          text-align: right !important;
        }
        .tf-stat-label {
          font-size: 11px !important;
          color: rgba(255, 255, 255, 0.6) !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
        }
        .tf-stat-val {
          font-size: 20px !important;
          font-weight: 700 !important;
        }

        .tf-btn-add {
          background: #11216B !important;
          color: #FFFFFF !important;
          border: none !important;
          border-radius: 99px !important;
          padding: 10px 24px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          cursor: pointer !important;
          box-shadow: 0 4px 12px rgba(17, 33, 107, 0.2) !important;
          transition: all 0.2s ease !important;
        }
        .tf-btn-add:hover {
          transform: translateY(-1px) !important;
          background: #1E3596 !important;
        }

        /* Layout Grid */
        .tf-main-grid {
          display: grid !important;
          grid-template-columns: 280px 1fr !important;
          gap: 32px !important;
          align-items: start !important;
        }

        .tf-sidebar {
          display: flex !important;
          flex-direction: column !important;
          gap: 24px !important;
        }

        /* Mini Calendar */
        .tf-minical-container {
          background: rgba(255, 255, 255, 0.12) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 20px !important;
          padding: 20px !important;
          box-shadow: 0 10px 30px rgba(0,0,0,0.02) !important;
        }
        
        .tf-minical-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 16px !important;
        }
        .tf-minical-title {
          font-size: 15px !important;
          font-weight: 700 !important;
        }
        .tf-minical-nav {
          display: flex !important;
          gap: 4px !important;
        }
        .tf-minical-btn {
          background: transparent !important;
          border: none !important;
          color: #FFFFFF !important;
          width: 24px !important;
          height: 24px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
        }
        .tf-minical-btn:hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }

        .tf-minical-grid {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr) !important;
          gap: 6px !important;
          text-align: center !important;
        }
        .tf-minical-weekday {
          font-size: 10px !important;
          font-weight: 600 !important;
          color: rgba(255, 255, 255, 0.5) !important;
          text-transform: uppercase !important;
        }
        .tf-minical-day {
          font-size: 11px !important;
          font-weight: 500 !important;
          height: 24px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 50% !important;
        }
        .tf-minical-day.active-week {
          background: rgba(255, 255, 255, 0.2) !important;
        }
        .tf-minical-day.today {
          background: #D4FC53 !important;
          color: #1E293B !important;
          font-weight: 700 !important;
        }

        /* Checklist Cards */
        .tf-checklist-card {
          background: #FFFFFF !important;
          color: #1E293B !important;
          border-radius: 20px !important;
          padding: 20px !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03) !important;
        }
        .tf-card-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 16px !important;
        }
        .tf-card-title {
          font-size: 15px !important;
          font-weight: 700 !important;
        }
        .tf-card-link {
          font-size: 12px !important;
          font-weight: 600 !important;
          color: #1E4BFF !important;
          text-decoration: none !important;
          cursor: pointer !important;
        }
        .tf-card-link:hover {
          color: #5E82FF !important;
        }

        .tf-checklist {
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
        }
        .tf-check-item {
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          color: #334155 !important;
        }
        .tf-check-circle {
          width: 18px !important;
          height: 18px !important;
          border: 1.5px solid #CBD5E1 !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
        }
        .tf-check-item.checked .tf-check-circle {
          border-color: #1E4BFF !important;
          background: #1E4BFF !important;
          color: #FFFFFF !important;
        }
        .tf-check-item.checked span {
          text-decoration: line-through !important;
          color: #94A3B8 !important;
        }

        /* Right Side Board */
        .tf-board-container {
          background: #FFFFFF !important;
          color: #1E293B !important;
          border-radius: 28px !important;
          padding: 28px !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05) !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 20px !important;
        }

        .tf-board-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
        }
        .tf-board-title {
          font-size: 18px !important;
          font-weight: 700 !important;
          color: #1E293B !important;
        }

        /* Timeline Grid Table */
        .tf-timeline-grid {
          display: grid !important;
          grid-template-columns: 70px repeat(6, 1fr) !important;
          border-top: 1px solid #F1F5F9 !important;
          margin-top: 8px !important;
        }
        
        .tf-grid-header {
          display: contents !important;
        }
        
        .tf-header-cell {
          padding: 16px 8px !important;
          text-align: center !important;
          border-bottom: 1px solid #F1F5F9 !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 2px !important;
        }
        .tf-header-day-num {
          font-size: 18px !important;
          font-weight: 700 !important;
          color: #1E293B !important;
        }
        .tf-header-day-name {
          font-size: 11px !important;
          color: #94A3B8 !important;
          text-transform: uppercase !important;
          font-weight: 600 !important;
        }

        .tf-grid-row {
          display: contents !important;
        }
        
        .tf-time-cell {
          padding: 16px 8px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          color: #94A3B8 !important;
          text-align: right !important;
          border-bottom: 1px solid #F1F5F9 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
        }
        
        .tf-content-cell {
          border-bottom: 1px solid #F1F5F9 !important;
          border-right: 1px solid #F8FAFC !important;
          padding: 8px !important;
          min-height: 100px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 8px !important;
          background: transparent !important;
          transition: background-color 0.2s ease !important;
        }
        .tf-content-cell:hover {
          background-color: #F8FAFC !important;
        }
        .tf-cell-active-week {
          background-color: rgba(30, 75, 255, 0.03) !important;
          border-left: 2px solid #1E4BFF !important;
        }
        .tf-cell-today {
          background-color: rgba(212, 252, 83, 0.08) !important;
          border: 1.5px solid #D4FC53 !important;
        }

        /* Cards Style exactly like reference */
        .tf-task-card {
          border-radius: 14px !important;
          padding: 12px !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          min-height: 80px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03) !important;
          transition: all 0.2s ease !important;
          cursor: pointer !important;
        }
        .tf-task-card:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08) !important;
        }
        
        .tf-card-lime {
          background-color: #D4FC53 !important;
          color: #1E293B !important;
        }
        .tf-card-slate {
          background-color: #4C65D9 !important;
          color: #FFFFFF !important;
        }
        
        .tf-card-title {
          font-size: 12px !important;
          font-weight: 700 !important;
          line-height: 1.3 !important;
          word-break: break-word !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 2 !important;
          line-clamp: 2 !important;
          -webkit-box-orient: vertical !important;
          overflow: hidden !important;
        }
        
        .tf-card-time {
          font-size: 10px !important;
          font-weight: 500 !important;
          opacity: 0.8 !important;
        }
        
        .tf-card-footer {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-top: 8px !important;
        }
        
        .tf-avatar-stack {
          display: flex !important;
          align-items: center !important;
        }
        .tf-avatar {
          width: 20px !important;
          height: 20px !important;
          border-radius: 50% !important;
          background: rgba(0,0,0,0.1) !important;
          border: 1.5px solid #D4FC53 !important;
          font-size: 8px !important;
          font-weight: 700 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin-left: -6px !important;
          color: #1E293B !important;
        }
        .tf-card-slate .tf-avatar {
          border-color: #4C65D9 !important;
          background: rgba(255,255,255,0.2) !important;
          color: #FFFFFF !important;
        }
        .tf-avatar:first-child {
          margin-left: 0 !important;
        }

        /* ═══════════════════════════════════════════
         * DAILY SUB-VIEW STYLES
         * ═══════════════════════════════════════════ */
        .tf-daily-container {
          display: flex !important;
          flex-direction: column !important;
          gap: 20px !important;
        }

        .tf-daily-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-end !important;
        }
        .tf-daily-title-group {
          display: flex !important;
          flex-direction: column !important;
          gap: 2px !important;
        }
        .tf-daily-title {
          font-size: 22px !important;
          font-weight: 800 !important;
          color: #1E293B !important;
          letter-spacing: -0.03em !important;
        }
        .tf-daily-subtitle {
          font-size: 13px !important;
          font-weight: 500 !important;
          color: #94A3B8 !important;
        }
        .tf-daily-summary {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }
        .tf-daily-count {
          font-size: 13px !important;
          font-weight: 700 !important;
          color: #1E4BFF !important;
          background: rgba(30, 75, 255, 0.08) !important;
          padding: 5px 14px !important;
          border-radius: 99px !important;
        }

        .tf-daily-day-picker {
          display: flex !important;
          gap: 8px !important;
          justify-content: stretch !important;
        }
        .tf-daily-day-pill {
          flex: 1 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 4px !important;
          padding: 10px 8px !important;
          border-radius: 14px !important;
          background: #F8FAFC !important;
          border: 1.5px solid transparent !important;
          cursor: pointer !important;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .tf-daily-day-pill:hover {
          background: #F1F5F9 !important;
          border-color: #E2E8F0 !important;
          transform: translateY(-2px) !important;
        }
        .tf-daily-day-pill.active {
          background: #1E4BFF !important;
          border-color: #1E4BFF !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 20px rgba(30, 75, 255, 0.25) !important;
        }
        .tf-daily-day-name {
          font-size: 10px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          color: #94A3B8 !important;
          letter-spacing: 0.05em !important;
        }
        .tf-daily-day-pill.active .tf-daily-day-name {
          color: rgba(255, 255, 255, 0.8) !important;
        }
        .tf-daily-day-num {
          font-size: 16px !important;
          font-weight: 800 !important;
          color: #1E293B !important;
        }
        .tf-daily-day-pill.active .tf-daily-day-num {
          color: #FFFFFF !important;
        }

        .tf-daily-timeline {
          display: flex !important;
          flex-direction: column !important;
          gap: 0 !important;
          border-left: 2px solid #E2E8F0 !important;
          margin-left: 38px !important;
          position: relative !important;
        }

        .tf-daily-slot {
          display: flex !important;
          align-items: flex-start !important;
          min-height: 52px !important;
          position: relative !important;
        }
        .tf-daily-time {
          position: absolute !important;
          left: -48px !important;
          top: 0 !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          color: #94A3B8 !important;
          width: 40px !important;
          text-align: right !important;
          font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
        }
        .tf-daily-slot-content {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
          padding: 8px 0 8px 20px !important;
          width: 100% !important;
          border-bottom: 1px solid #F1F5F9 !important;
        }
        .tf-daily-slot-content.empty {
          min-height: 32px !important;
        }

        .tf-daily-task-card {
          border-radius: 12px !important;
          padding: 10px 14px !important;
          cursor: pointer !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 6px !important;
          min-width: 180px !important;
          max-width: 280px !important;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
        }
        .tf-daily-task-card:hover {
          transform: translateY(-2px) scale(1.01) !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1) !important;
        }
        .tf-daily-task-top {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }
        .tf-daily-status-dot {
          width: 7px !important;
          height: 7px !important;
          border-radius: 50% !important;
          flex-shrink: 0 !important;
        }
        .tf-daily-task-client {
          font-size: 12px !important;
          font-weight: 700 !important;
          line-height: 1.3 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
        .tf-daily-task-bottom {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }
        .tf-daily-task-time {
          font-size: 10px !important;
          font-weight: 500 !important;
          opacity: 0.7 !important;
        }

        /* ═══════════════════════════════════════════
         * WEEKLY SUB-VIEW STYLES
         * ═══════════════════════════════════════════ */
        .tf-weekly-container {
          display: flex !important;
          flex-direction: column !important;
          gap: 20px !important;
        }
        .tf-weekly-header {
          display: flex !important;
          justify-content: flex-start !important;
          align-items: center !important;
        }
        .tf-weekly-stats {
          display: flex !important;
          gap: 24px !important;
        }
        .tf-weekly-stat {
          display: flex !important;
          flex-direction: column !important;
          gap: 2px !important;
        }
        .tf-weekly-stat-val {
          font-size: 22px !important;
          font-weight: 800 !important;
          color: #1E293B !important;
          letter-spacing: -0.03em !important;
        }
        .tf-weekly-stat-label {
          font-size: 11px !important;
          font-weight: 600 !important;
          color: #94A3B8 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
        }

        .tf-weekly-columns {
          display: grid !important;
          grid-template-columns: repeat(6, 1fr) !important;
          gap: 12px !important;
        }
        .tf-weekly-column {
          display: flex !important;
          flex-direction: column !important;
          gap: 0 !important;
          background: #F8FAFC !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          border: 1.5px solid transparent !important;
          transition: all 0.2s ease !important;
        }
        .tf-weekly-column.today {
          border-color: #1E4BFF !important;
          background: rgba(30, 75, 255, 0.03) !important;
          box-shadow: 0 4px 16px rgba(30, 75, 255, 0.08) !important;
        }
        .tf-weekly-col-header {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 4px !important;
          padding: 14px 8px 10px !important;
          border-bottom: 1px solid #E2E8F0 !important;
        }
        .tf-weekly-col-day {
          font-size: 11px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          color: #94A3B8 !important;
        }
        .tf-weekly-col-num {
          font-size: 18px !important;
          font-weight: 800 !important;
          color: #1E293B !important;
          width: 32px !important;
          height: 32px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 50% !important;
        }
        .tf-weekly-col-num.today {
          background: #1E4BFF !important;
          color: #FFFFFF !important;
        }
        .tf-weekly-col-tasks {
          display: flex !important;
          flex-direction: column !important;
          gap: 6px !important;
          padding: 8px 6px !important;
          min-height: 120px !important;
        }
        .tf-weekly-empty-slot {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 20px !important;
          opacity: 0.5 !important;
        }

        .tf-weekly-task {
          display: flex !important;
          gap: 0 !important;
          border-radius: 10px !important;
          overflow: hidden !important;
          cursor: pointer !important;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04) !important;
        }
        .tf-weekly-task:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1) !important;
        }
        .tf-weekly-task-indicator {
          width: 4px !important;
          flex-shrink: 0 !important;
        }
        .tf-weekly-task-body {
          display: flex !important;
          flex-direction: column !important;
          gap: 4px !important;
          padding: 8px 10px !important;
          flex: 1 !important;
          min-width: 0 !important;
        }
        .tf-weekly-task-name {
          font-size: 11px !important;
          font-weight: 700 !important;
          line-height: 1.3 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
        .tf-weekly-task-meta {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          font-size: 9px !important;
          font-weight: 500 !important;
          opacity: 0.7 !important;
        }
      }
      @media (max-width: 430px) {
        .cascade-item {
          opacity: 1 !important;
          animation: none !important;
        }
        .cronograma-header { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
        
        .cronograma-header .segmented-control {
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
        .cronograma-header .segmented-slider {
          position: absolute !important;
          background-color: #ffffff !important;
          border-radius: 7px !important;
          height: calc(100% - 4px) !important;
          top: 2px !important;
          left: 2px !important;
          width: calc((100% - 4px) / 3) !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.12) !important;
          z-index: 1 !important;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
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
          flex: 1 !important;
          min-width: 0 !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
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

        /* Mobile Monthly Calendar Reference Styles */
        @keyframes mCascadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        #page-container.tf-page-active .cascade-item {
          opacity: 0;
          animation: mCascadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
          animation-delay: calc(var(--index, 0) * 0.08s) !important;
        }

        #page-container.tf-page-active .mobile-only {
          display: flex !important;
          flex-direction: column !important;
          background: #F8FAFC !important;
          padding: 16px !important;
          gap: 20px !important;
        }

        .m-calendar-wrapper {
          background: #FFFFFF !important;
          border-radius: 24px !important;
          padding: 20px !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04) !important;
          border: 1px solid rgba(0, 0, 0, 0.03) !important;
          font-family: 'Outfit', -apple-system, sans-serif !important;
        }
        .m-calendar-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 20px !important;
        }
        .m-calendar-date {
          font-size: 15px !important;
          font-weight: 700 !important;
          color: #0F172A !important;
        }
        .m-calendar-nav {
          display: flex !important;
          gap: 12px !important;
        }
        .m-calendar-nav-btn {
          background: transparent !important;
          border: none !important;
          color: #64748B !important;
          cursor: pointer !important;
          padding: 4px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .m-calendar-grid {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr) !important;
          gap: 8px 4px !important;
          text-align: center !important;
        }
        .m-calendar-weekday {
          font-size: 11px !important;
          font-weight: 600 !important;
          color: #94A3B8 !important;
          text-transform: capitalize !important;
          padding-bottom: 8px !important;
        }
        .m-calendar-day {
          font-size: 13px !important;
          font-weight: 600 !important;
          color: #334155 !important;
          height: 36px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 50% !important;
          cursor: pointer !important;
          position: relative !important;
          transition: all 0.2s ease !important;
        }
        .m-calendar-day.empty {
          cursor: default !important;
          pointer-events: none !important;
        }
        .m-calendar-day.active {
          background: #0F172A !important;
          color: #FFFFFF !important;
        }
        .m-calendar-day:not(.empty):not(.active):hover {
          background: #F1F5F9 !important;
        }
        .m-calendar-day-dots {
          display: flex !important;
          gap: 2px !important;
          justify-content: center !important;
          position: absolute !important;
          bottom: 3px !important;
          width: 100% !important;
          height: 4px !important;
        }
        .m-calendar-dot {
          width: 4px !important;
          height: 4px !important;
          border-radius: 50% !important;
        }
        .m-calendar-dot.green { background: #34C759 !important; }
        .m-calendar-dot.blue { background: #007AFF !important; }
        .m-calendar-dot.yellow { background: #FF9500 !important; }

        .m-tasks-section {
          background: #FFFFFF !important;
          border-radius: 24px !important;
          padding: 20px !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04) !important;
          border: 1px solid rgba(0, 0, 0, 0.03) !important;
          font-family: 'Outfit', -apple-system, sans-serif !important;
        }
        .m-tasks-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 16px !important;
        }
        .m-tasks-title-group {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          cursor: pointer !important;
        }
        .m-tasks-title {
          font-size: 18px !important;
          font-weight: 700 !important;
          color: #0F172A !important;
        }
        .m-tasks-plus-btn {
          width: 36px !important;
          height: 36px !important;
          border-radius: 50% !important;
          background: #1E4BFF !important;
          color: #FFFFFF !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: none !important;
          cursor: pointer !important;
          box-shadow: 0 4px 12px rgba(30, 75, 255, 0.2) !important;
        }
        .m-tasks-list {
          display: flex !important;
          flex-direction: column !important;
          gap: 16px !important;
        }
        .m-task-item {
          display: flex !important;
          align-items: flex-start !important;
          gap: 14px !important;
          padding-bottom: 16px !important;
          border-bottom: 1px solid #F1F5F9 !important;
        }
        .m-task-item:last-child {
          border-bottom: none !important;
          padding-bottom: 0 !important;
        }
        .m-task-icon-wrapper {
          width: 36px !important;
          height: 36px !important;
          border-radius: 10px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
        }
        .m-task-icon-wrapper.concluida { background: rgba(52, 199, 89, 0.1) !important; color: #34C759 !important; }
        .m-task-icon-wrapper.em_andamento { background: rgba(0, 122, 255, 0.1) !important; color: #007AFF !important; }
        .m-task-icon-wrapper.pendente { background: rgba(255, 149, 0, 0.1) !important; color: #FF9500 !important; }

        .m-task-details {
          display: flex !important;
          flex-direction: column !important;
          gap: 2px !important;
          flex-grow: 1 !important;
        }
        .m-task-cat {
          font-size: 11px !important;
          font-weight: 500 !important;
          color: #94A3B8 !important;
        }
        .m-task-name {
          font-size: 14px !important;
          font-weight: 700 !important;
          color: #1E293B !important;
          line-height: 1.3 !important;
        }
        .m-task-time {
          font-size: 12px !important;
          color: #64748B !important;
          margin-top: 2px !important;
        }
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
