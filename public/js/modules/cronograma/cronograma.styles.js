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
        .segmented-control { width: 100% !important; margin-bottom: 8px !important; }
        .cronograma-actions { display: flex !important; flex-wrap: wrap !important; gap: 8px !important; }
        .cronograma-actions .btn { flex: 1 !important; white-space: nowrap !important; font-size: 12px !important; padding: 10px !important; }
        
        .week-nav { justify-content: space-between !important; padding: 0 4px !important; }
        .week-nav h3 { font-size: 16px !important; }
        
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
          background: #fff !important; 
          border-radius: 16px !important; 
          border: 1px solid var(--separator) !important;
          overflow: hidden !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04) !important;
        }
        
        .baker-header-mobile {
          padding: 16px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          background: #F9FAFB !important;
          cursor: pointer !important;
          border-bottom: 1px solid transparent !important;
          transition: all 0.2s !important;
        }
        .baker-row-mobile.expanded .baker-header-mobile { border-bottom-color: var(--separator) !important; background: #fff !important; }
        
        .days-scroll-mobile {
          display: none !important;
          overflow-x: auto !important;
          padding: 12px !important;
          gap: 12px !important;
          background: #fff !important;
          -webkit-overflow-scrolling: touch !important;
        }
        .baker-row-mobile.expanded .days-scroll-mobile { display: flex !important; }
        
        .day-column-mobile {
          min-width: 160px !important;
          flex-shrink: 0 !important;
          background: #F8FAFC !important;
          border-radius: 12px !important;
          padding: 10px !important;
          border: 1px solid #E2E8F0 !important;
        }
        
        .day-label-mobile {
          font-size: 11px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          color: var(--text-tertiary) !important;
          margin-bottom: 8px !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
        }
        
        .matrix-add-btn { 
          width: 44px !important; 
          height: 44px !important; 
          margin-top: 8px !important;
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
