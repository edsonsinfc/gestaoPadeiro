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
