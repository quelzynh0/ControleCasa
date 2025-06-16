const content = document.getElementById('content');
const rooms = ["Quarto", "Sala", "Cozinha", "Banheiro", "Área de Serviço"];
let selectedRoom = null;
let activeTab = 'home';
const items = {}; // formato: { "Quarto": [ { id, name, ... }, ... ] }

// 🔗 Substitua pela sua URL pública do Apps Script
const SHEET_URL = "https://script.google.com/macros/s/AKfycbyqhpJQb0RakdtaO1dBtDYlBfb3HjTLXU4FGXaCE-HY2GUMloiLCwi2zNdrmtyBkrV_/exec";

// Gera UUID aleatório
function gerarUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Carrega dados do Google Sheets
function carregarItensDoSheet() {
  fetch(SHEET_URL)
    .then(res => res.json())
    .then(data => {
      data.forEach(entry => {
        const room = entry["Cômodo"];
        if (!items[room]) items[room] = [];

        items[room].push({
          id: entry["ID"],
          name: entry["Nome"],
          priority: entry["Prioridade"] || 'baixa',
          valor: parseFloat(entry["Valor"]) || 0,
          link: entry["Link"] || '',
          have: String(entry["Tenho"]).toLowerCase() === 'true'
        });
      });
      showTab('home');
    })
    .catch(err => console.error('Erro ao carregar dados do Sheets:', err));
}

function showTab(tab) {
  activeTab = tab;
  document.getElementById('tab-home').classList.toggle('active-tab', tab === 'home');
  document.getElementById('tab-resumo').classList.toggle('active-tab', tab === 'resumo');
  tab === 'home' ? renderRoomSelection() : renderResumo();
}

function renderRoomSelection() {
  content.innerHTML = '<h2>Escolha um cômodo:</h2>';
  const container = document.createElement('div');
  container.className = 'room-list';
  rooms.forEach(room => {
    const btn = document.createElement('button');
    btn.textContent = room;
    btn.onclick = () => {
      selectedRoom = room;
      renderItems();
    };
    container.appendChild(btn);
  });
  content.appendChild(container);
}

function renderItems() {
  content.innerHTML = `<h2>${selectedRoom}</h2>`;

  const addBtn = document.createElement('button');
  addBtn.textContent = 'Adicionar Novo Item';
  addBtn.className = 'add-item-btn';
  addBtn.style.marginBottom = '20px';
  addBtn.onclick = () => openEditModal();
  content.appendChild(addBtn);

  // 🔽 Filtros
  const filtroDiv = document.createElement('div');
  filtroDiv.style = 'display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;';

filtroDiv.innerHTML = `
  <div style="display: flex; flex-direction: column;">
    <label><strong>Status:</strong></label>
    <select id="filtroStatusItens" style="padding: 10px; border-radius: 6px; border: 1px solid #ccc;">
      <option value="todos" selected>Todos</option>
      <option value="tenho">Apenas os que Tenho</option>
      <option value="naoTenho">Apenas os que Faltam</option>
    </select>
  </div>
  <div style="display: flex; flex-direction: column;">
    <label><strong>Prioridade:</strong></label>
    <select id="filtroPrioridadeItens" style="padding: 10px; border-radius: 6px; border: 1px solid #ccc;">
      <option value="todas" selected>Todas</option>
      <option value="alta">Alta</option>
      <option value="media">Média</option>
      <option value="baixa">Baixa</option>
    </select>
  </div>
`;

  content.appendChild(filtroDiv);

  const list = document.createElement('div');
  content.appendChild(list);

  const statusSelect = filtroDiv.querySelector('#filtroStatusItens');
  const prioridadeSelect = filtroDiv.querySelector('#filtroPrioridadeItens');

  function renderFiltrados() {
    list.innerHTML = '';
    const status = statusSelect.value;
    const prioridade = prioridadeSelect.value;

    const filtrados = (items[selectedRoom] || []).filter(i => {
      const statusOk =
        status === 'todos' ? true :
        status === 'tenho' ? i.have :
        !i.have;

      const prioridadeOk =
        prioridade === 'todas' ? true :
        i.priority === prioridade;

      return statusOk && prioridadeOk;
    });

    filtrados.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'item';

      const top = document.createElement('div');
      top.className = 'item-top';
      const title = document.createElement('strong');
      title.textContent = item.name;
      const priority = document.createElement('small');
      priority.textContent = `Prioridade: ${item.priority}`;
      top.appendChild(title);
      top.appendChild(priority);

      const actions = document.createElement('div');
      actions.className = 'item-actions';

      const toggleBtn = document.createElement('button');
      toggleBtn.textContent = item.have ? 'Tenho' : 'Não Tenho';
      toggleBtn.className = item.have ? 'have-btn-true' : 'have-btn-false';
      toggleBtn.onclick = () => {
        item.have = !item.have;
        enviarItemParaSheet(item);
        renderFiltrados();
      };

      const editBtn = document.createElement('button');
      editBtn.textContent = 'Editar';
      editBtn.className = 'edit-btn';
      editBtn.onclick = () => openEditModal(i);

      actions.appendChild(toggleBtn);
      actions.appendChild(editBtn);

      div.appendChild(top);
      div.appendChild(document.createTextNode(`Valor: R$ ${item.valor.toFixed(2).replace('.', ',')}`));
      div.appendChild(actions);
      list.appendChild(div);
    });
  }

  statusSelect.onchange = renderFiltrados;
  prioridadeSelect.onchange = renderFiltrados;

  renderFiltrados();
}


function openEditModal(index = null) {
  const modalId = `modal-${Date.now()}`;
  const modal = document.createElement('div');
  modal.id = modalId;
  modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;";

  const form = document.createElement('div');
  form.className = 'add-item';
  form.style = "background:#fff;padding:20px;border-radius:8px;width:90%;max-width:400px;";

  const isEdit = index !== null;
  const item = isEdit ? items[selectedRoom][index] : { id: gerarUUID(), name: '', priority: 'alta', valor: '', link: '', have: false };

  form.innerHTML = `
  <h3>${isEdit ? 'Editar Item' : 'Novo Item'}</h3>
  <input type="text" id="modalItemName" placeholder="Nome do item" value="${item.name}">
  <label>Prioridade</label>
  <select id="modalItemPriority">
    <option value="alta" ${item.priority === 'alta' ? 'selected' : ''}>Alta</option>
    <option value="media" ${item.priority === 'media' ? 'selected' : ''}>Média</option>
    <option value="baixa" ${item.priority === 'baixa' ? 'selected' : ''}>Baixa</option>
  </select>
  <input type="number" id="modalItemValor" placeholder="Valor (R$)" value="${item.valor || ''}" min="0" step="0.01">
  <input type="text" id="modalItemLink" placeholder="Loja ou Link da compra" value="${item.link || ''}">
  <button onclick="saveModalItem(${isEdit ? index : null}, '${modalId}', '${item.id}')">Salvar</button>
  <button class="cancel-btn" onclick="document.getElementById('${modalId}').remove()">Cancelar</button>
  ${isEdit ? `<button class="delete-btn" onclick="excluirItem('${item.id}', '${modalId}')">Excluir</button>` : ''}
`;

  modal.appendChild(form);
  document.body.appendChild(modal);
}

function saveModalItem(index, modalId, id) {
  const name = document.getElementById('modalItemName').value.trim();
  const priority = document.getElementById('modalItemPriority').value;
  const valor = parseFloat(document.getElementById('modalItemValor').value) || 0;
  const link = document.getElementById('modalItemLink').value.trim();

  if (!name) {
    showModalMensagem('Por favor, insira um nome válido para o item.');
    return;
  }

  const newItem = { id, name, priority, valor, link, have: false, room: selectedRoom };

  if (index !== null) {
    newItem.have = items[selectedRoom][index].have;
    items[selectedRoom][index] = newItem;
  } else {
    if (!items[selectedRoom]) items[selectedRoom] = [];
    items[selectedRoom].push(newItem);
  }

  enviarItemParaSheet(newItem);
  document.getElementById(modalId).remove();
  renderItems();
}

function excluirItem(id, modalId) {
  showModalConfirmacao("Tem certeza que deseja excluir este item?", () => {
    fetch(SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ID: id, _excluir: true })
    })
    .then(() => {
      showModalMensagem("Item excluído com sucesso!", () => {
        document.getElementById(modalId).remove();
        location.reload();
      });
    })
    .catch(err => {
      console.error("Erro ao excluir:", err);
      showModalMensagem("Erro ao excluir item.");
    });
  });
}



function renderResumo() {
  content.innerHTML = '<h2>Resumo de Valores</h2>';

  const filtroDiv = document.createElement('div');
  filtroDiv.style = 'display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;';

  // Criar as opções dos cômodos dinamicamente
  const roomOptions = [`<option value="todos" selected>Todos</option>`]
    .concat(rooms.map(r => `<option value="${r}">${r}</option>`)).join('');

  filtroDiv.innerHTML = `
    <div style="display: flex; flex-direction: column;">
      <label><strong>Cômodo:</strong></label>
      <select id="filtroComodo" style="padding: 10px; border-radius: 6px; border: 1px solid #ccc;">
        ${roomOptions}
      </select>
    </div>
    <div style="display: flex; flex-direction: column;">
      <label><strong>Status:</strong></label>
      <select id="filtroStatus" style="padding: 10px; border-radius: 6px; border: 1px solid #ccc;">
        <option value="todos">Todos</option>
        <option value="tenho">Apenas os que Tenho</option>
        <option value="naoTenho" selected>Apenas os que Faltam</option>
      </select>
    </div>
    <div style="display: flex; flex-direction: column;">
      <label><strong>Prioridade:</strong></label>
      <select id="filtroPrioridade" style="padding: 10px; border-radius: 6px; border: 1px solid #ccc;">
        <option value="todas">Todas</option>
        <option value="alta" selected>Alta</option>
        <option value="media">Média</option>
        <option value="baixa">Baixa</option>
      </select>
    </div>
  `;

  content.appendChild(filtroDiv);

  const statusSelect = filtroDiv.querySelector('#filtroStatus');
  const prioridadeSelect = filtroDiv.querySelector('#filtroPrioridade');
  const comodoSelect = filtroDiv.querySelector('#filtroComodo');

  function renderResumoFiltrado() {
    content.innerHTML = '<h2>Resumo de Valores</h2>';
    content.appendChild(filtroDiv);
    let totalGeral = 0;

    const statusSelecionado = statusSelect.value;
    const prioridadeSelecionada = prioridadeSelect.value;
    const comodoSelecionado = comodoSelect.value;

    const comodosParaExibir = comodoSelecionado === 'todos' ? rooms : [comodoSelecionado];

    comodosParaExibir.forEach(room => {
      if (!items[room]) return;

      const filtrados = items[room].filter(i => {
        if (statusSelecionado === 'tenho') return i.have;
        if (statusSelecionado === 'naoTenho') return !i.have;
        return true;
      }).filter(i => {
        if (prioridadeSelecionada === 'todas') return true;
        return i.priority === prioridadeSelecionada;
      });

      if (!filtrados.length) return;

      const subtotal = filtrados.reduce((acc, i) => acc + i.valor, 0);
      totalGeral += subtotal;

      const roomDiv = document.createElement('div');
      roomDiv.innerHTML = `<strong>${room}:</strong> R$ ${subtotal.toFixed(2).replace('.', ',')}`;
      content.appendChild(roomDiv);
    });

    const totalDiv = document.createElement('h3');
    totalDiv.textContent = `Total Geral: R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
    content.appendChild(totalDiv);
  }

  statusSelect.onchange = renderResumoFiltrado;
  prioridadeSelect.onchange = renderResumoFiltrado;
  comodoSelect.onchange = renderResumoFiltrado;

  renderResumoFiltrado(); // inicial
}


// Envia dados para o Google Sheets
function enviarItemParaSheet(item) {
  const data = {
    ID: item.id,
    "Cômodo": item.room,
    "Nome": item.name,
    "Prioridade": item.priority,
    "Valor": item.valor,
    "Link": item.link,
    "Tenho": item.have
  };

  fetch(SHEET_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(() => console.log("Item enviado:", data))
    .catch(err => console.error("Erro ao enviar:", err));
}

carregarItensDoSheet();

function showModalMensagem(texto, callback = null) {
  const modalId = `modal-msg-${Date.now()}`;
  const modal = document.createElement('div');
  modal.id = modalId;
  modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;";

  const box = document.createElement('div');
  box.style = "background:#fff;padding:20px 30px;border-radius:8px;text-align:center;max-width:90%;box-shadow:0 2px 10px rgba(0,0,0,0.3);";
  box.innerHTML = `
    <p style="margin-bottom: 20px;">${texto}</p>
    <button style="padding:10px 20px;border:none;background:#4CAF50;color:white;border-radius:5px;cursor:pointer;">OK</button>
  `;

  box.querySelector('button').onclick = () => {
    document.getElementById(modalId).remove();
    if (callback) callback();
  };

  modal.appendChild(box);
  document.body.appendChild(modal);
}

function showModalConfirmacao(mensagem, aoConfirmar) {
  const modalId = `modal-confirm-${Date.now()}`;
  const modal = document.createElement('div');
  modal.id = modalId;
  modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;";

  const box = document.createElement('div');
  box.style = "background:#fff;padding:20px 30px;border-radius:8px;text-align:center;max-width:90%;box-shadow:0 2px 10px rgba(0,0,0,0.3);";
  box.innerHTML = `
    <p style="margin-bottom: 20px;">${mensagem}</p>
    <div style="display: flex; gap: 10px; justify-content: center;">
      <button id="btnConfirmar" style="padding:10px 20px;background:#d9534f;color:white;border:none;border-radius:5px;cursor:pointer;">Sim</button>
      <button id="btnCancelar" style="padding:10px 20px;background:#ccc;border:none;border-radius:5px;cursor:pointer;">Cancelar</button>
    </div>
  `;

  box.querySelector('#btnConfirmar').onclick = () => {
    document.getElementById(modalId).remove();
    aoConfirmar();
  };
  box.querySelector('#btnCancelar').onclick = () => {
    document.getElementById(modalId).remove();
  };

  modal.appendChild(box);
  document.body.appendChild(modal);
}

