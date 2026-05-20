"""HTML content for the Finance Flow Pro application."""

INDEX_HTML = """<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Finance Flow Pro</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2.1.1/out/water.min.css" />
    <style>
      :root {
        --form-element-valid-border-color: #4caf50;
        --form-element-invalid-border-color: #f44336;
        --muted-color: #999;
      }
      
      body { max-width: 900px; margin: 0 auto; padding: 20px; }
      .container { display: flex; gap: 20px; flex-wrap: wrap; }
      .card { flex: 1; min-width: 250px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
      .form-group { margin-bottom: 15px; }
      .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
      .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px; }
      .results { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 20px; }
      .results h3 { margin-top: 0; }
      .result-item { margin: 8px 0; }
      .help-icon { cursor: help; margin-left: 5px; }
    </style>
  </head>
  <body>
    <h1>Finance Flow Pro FULL</h1>
    <p>Simulador avancado de credito com funcionalidades de Open Finance.</p>
    
    <div class="container">
      <div class="card">
        <h2>Simulador de Credito</h2>
        <form id="creditForm">
          <div class="form-group">
            <label>Valor desejado (R$)</label>
            <input type="number" id="amount" step="0.01" required />
          </div>
          
          <div class="form-group">
            <label>Taxa <span class="help-icon">?</span></label>
            <input type="number" id="rate" step="0.01" required />
          </div>
          
          <div class="form-group">
            <label>Periodo (meses)</label>
            <input type="number" id="months" step="1" required />
          </div>
          
          <div class="form-group">
            <label>Tipo de amortizacao</label>
            <select id="amortization" required>
              <option value="price">Price</option>
              <option value="sac">SAC</option>
              <option value="estruturada">Estruturada</option>
              <option value="personalizada">Personalizada</option>
            </select>
          </div>
          
          <button type="submit">Simular</button>
        </form>
      </div>
      
      <div id="results" class="results" style="display:none;">
        <h3>Resultados da Simulacao</h3>
        <div id="resultsContent"></div>
      </div>
    </div>
    
    <script>
      document.getElementById('creditForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const data = {
          amount: parseFloat(document.getElementById('amount').value),
          rate: parseFloat(document.getElementById('rate').value),
          rate_period: 'monthly',
          rate_type: 'prefixada',
          index: 'none',
          amortization: document.getElementById('amortization').value,
          months: parseInt(document.getElementById('months').value),
          grace: 0,
          extension: 0,
          iof: 0.38,
          fees: 0,
          insurance: 0,
          custom_schedule: []
        };
        
        try {
          const response = await fetch('/api/credit/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          
          const result = await response.json();
          
          let html = '<div class="result-item"><strong>Taxa Efetiva:</strong> ' + (result.effective_annual_rate || 0).toFixed(2) + '%</div>';
          html += '<div class="result-item"><strong>CET Anual:</strong> ' + (result.cet_annual || 0).toFixed(2) + '%</div>';
          html += '<div class="result-item"><strong>Total de Juros:</strong> R$ ' + (result.total_interest || 0).toFixed(2) + '</div>';
          html += '<div class="result-item"><strong>Total a Pagar:</strong> R$ ' + (result.total_payment || 0).toFixed(2) + '</div>';
          html += '<div class="result-item"><strong>IOF:</strong> R$ ' + (result.iof_cost || 0).toFixed(2) + '</div>';
          
          document.getElementById('resultsContent').innerHTML = html;
          document.getElementById('results').style.display = 'block';
        } catch (error) {
          console.error('Erro:', error);
          alert('Erro ao simular: ' + error.message);
        }
      });
    </script>
  </body>
</html>"""

STYLES_CSS = """/* Placeholder styles - using Water.css via CDN in HTML */"""

APP_JS = """// Placeholder - JavaScript is inline in HTML for simplicity"""
