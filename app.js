const API_URL = '/api'; // URL relative — fonctionne en local ET sur Railway

function formatCurrency(val) {
    if (!val && val !== 0) return '-';
    let parts = parseFloat(val).toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return parts.join('.') + ' €';
}

let allClientsData = [];
let allCommerciaux = [];
let allInstallations = [];
let currentEditId = null;
let currentView = 'dashboard';
let lastView = 'dashboard';

const titles = {
    'dashboard': 'Tableau de bord',
    'new-client': 'Nouveau dossier',
    'clients-list': 'Liste des clients',
    'clients-signed': 'Clients signés',
    'settings': 'Paramètres',
    'facturation': 'Facturation & Acomptes',
    'chantier': 'Suivi de Chantier',
    'calculator': 'Simulateur Solaire'
};

function openDashboard() {
    switchView('dashboard');
}

function openNewClient() {
    currentEditId = null;
    document.getElementById('clientForm').reset();
    const indicator = document.getElementById('reste-indicator');
    if (indicator) indicator.style.display = 'none';
    titles['new-client'] = 'Nouveau dossier';
    switchView('new-client');
}

function openSettings() {
    loadCommerciaux();
    loadInstallations();
    switchView('settings');
}

function openFacturation() {
    switchView('facturation');
}

async function loadCommerciaux() {
    try {
        const res = await fetch(`${API_URL}/commerciaux`);
        const data = await res.json();
        allCommerciaux = data.commerciaux || [];

        const selectElement = document.getElementById('commercialSelect');
        const currentValue = selectElement.value;

        selectElement.innerHTML = '<option value="">-- Choisir --</option>';
        allCommerciaux.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.nom;
            opt.text = c.nom;
            selectElement.appendChild(opt);
        });
        selectElement.value = currentValue;

        const tbody = document.getElementById('settingsCommerciauxList');
        if (tbody) {
            tbody.innerHTML = '';
            if (allCommerciaux.length === 0) {
                tbody.innerHTML = '<tr><td colspan="2">Aucun commercial trouvé.</td></tr>';
            }
            allCommerciaux.forEach(c => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${c.nom}</td>
                    <td>
                        <button class="icon-btn" onclick="deleteCommercial(${c.id})" style="color:var(--danger)"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (err) {
        console.error("Erreur commerciaux", err);
    }
}

async function addCommercial() {
    const nom = document.getElementById('addCommercialName').value.trim();
    if (!nom) return;
    try {
        await fetch(`${API_URL}/commerciaux`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom })
        });
        document.getElementById('addCommercialName').value = '';
        loadCommerciaux();
    } catch (e) {
        alert("Erreur lors de l'ajout.");
    }
}

async function deleteCommercial(id) {
    if (!confirm("Supprimer ce commercial ? (Les dossiers clients existants garderont son nom)")) return;
    try {
        await fetch(`${API_URL}/commerciaux/${id}`, { method: 'DELETE' });
        loadCommerciaux();
    } catch (e) {
        alert("Erreur lors de la suppression.");
    }
}

async function loadInstallations() {
    try {
        const res = await fetch(`${API_URL}/installations`);
        const data = await res.json();
        allInstallations = data.installations || [];

        const selectElement = document.getElementById('installationSelect');
        const currentValue = selectElement.value;

        selectElement.innerHTML = '<option value="">Sélectionner...</option>';
        allInstallations.forEach(i => {
            const opt = document.createElement('option');
            opt.value = i.nom;
            opt.text = i.nom;
            selectElement.appendChild(opt);
        });
        selectElement.value = currentValue;

        const tbody = document.getElementById('settingsInstallationsList');
        if (tbody) {
            tbody.innerHTML = '';
            if (allInstallations.length === 0) {
                tbody.innerHTML = "<tr><td colspan=\"2\">Aucun type d'installation.</td></tr>";
            }
            allInstallations.forEach(i => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${i.nom}</td>
                    <td>
                        <button class="icon-btn" onclick="deleteInstallation(${i.id})" style="color:var(--danger)"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (err) {
        console.error("Erreur installations", err);
    }
}

async function addInstallation() {
    const nom = document.getElementById('addInstallationName').value.trim();
    if (!nom) return;
    try {
        await fetch(`${API_URL}/installations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom })
        });
        document.getElementById('addInstallationName').value = '';
        loadInstallations();
    } catch (e) {
        alert("Erreur lors de l'ajout.");
    }
}

async function deleteInstallation(id) {
    if (!confirm("Supprimer ce type d'installation ? (Les dossiers clients existants le garderont)")) return;
    try {
        await fetch(`${API_URL}/installations/${id}`, { method: 'DELETE' });
        loadInstallations();
    } catch (e) {
        alert("Erreur lors de la suppression.");
    }
}

function editClient(id) {
    currentEditId = id;
    titles['new-client'] = 'Modifier le dossier';

    const client = allClientsData.find(c => c.id === id);
    if (client) {
        const formObj = document.getElementById('clientForm');
        formObj.reset();
        const indicator = document.getElementById('reste-indicator');
        if (indicator) indicator.style.display = 'none';

        Object.keys(client).forEach(key => {
            const el = formObj.elements[key];
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = !!client[key];
                } else {
                    el.value = client[key] !== null ? client[key] : '';
                }
            }
        });
    }
    switchView('new-client');
}

function switchView(viewName) {
    if (viewName !== currentView) {
        lastView = currentView;
        currentView = viewName;
    }

    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const viewEl = document.getElementById('view-' + viewName);
    if (viewEl) viewEl.classList.add('active');

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(nav => {
        const onclickAttr = nav.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes(viewName)) {
            nav.classList.add('active');
        }
    });

    document.getElementById('page-title').innerText = titles[viewName] || 'Logiciel';
 
    if (viewName === 'dashboard' || viewName === 'clients-list' || viewName === 'clients-signed' || viewName === 'facturation' || viewName === 'chantier') {
        fetchClients();
    }
}

function goBack() {
    switchView(lastView);
}

function getBadgeClass(status) {
    if (!status) return 'badge';
    status = status.toLowerCase();
    if (status.includes('signé') || status.includes('terminé') || status.includes('validé')) return 'badge badge-success';
    if (status.includes('attente') || status.includes('cours') || status.includes('devis')) return 'badge badge-warning';
    if (status.includes('rdv')) return 'badge badge-blue';
    return 'badge';
}

let currentSortColumn = null;
let currentSortDirection = 1;

function sortTable(column) {
    if (currentSortColumn === column) {
        currentSortDirection *= -1;
    } else {
        currentSortColumn = column;
        currentSortDirection = 1;
    }
    applySort();
}

function applySort() {
    if (!currentSortColumn) return;

    allClientsData.sort((a, b) => {
        let valA, valB;
 
        const numericColumns = ['montant_devis', 'acompte_1_montant', 'acompte_2_montant', 'solde_montant'];
        const dateColumns = ['date_rdv', 'date_contact', 'date_signature', 'date_debut'];
        
        if (currentSortColumn === 'reste') {
            valA = (a.montant_devis || 0) - (a.acompte_1_montant || 0) - (a.acompte_2_montant || 0) - (a.solde_montant || 0);
            valB = (b.montant_devis || 0) - (b.acompte_1_montant || 0) - (b.acompte_2_montant || 0) - (b.solde_montant || 0);
        } else if (numericColumns.includes(currentSortColumn)) {
            valA = parseFloat(a[currentSortColumn]) || 0;
            valB = parseFloat(b[currentSortColumn]) || 0;
        } else if (dateColumns.includes(currentSortColumn)) {
            valA = a[currentSortColumn] || '0000-00-00';
            valB = b[currentSortColumn] || '0000-00-00';
        } else {
            valA = (a[currentSortColumn] || '').toString().toLowerCase();
            valB = (b[currentSortColumn] || '').toString().toLowerCase();
        }
 
        if (valA < valB) return -1 * currentSortDirection;
        if (valA > valB) return 1 * currentSortDirection;
        return 0;
    });
 
    renderFullClientsTable();
    renderFacturationTable();
    renderChantierTable();
}

function renderFullClientsTable() {
    const tableBody = document.getElementById('fullClientsTableBody');
    const signedTableBody = document.getElementById('signedClientsTableBody');
    tableBody.innerHTML = '';
    if (signedTableBody) signedTableBody.innerHTML = '';

    const clients = allClientsData;

    if (clients.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px;">Aucun client trouvé. Commencez par créer un dossier !</td></tr>';
    } else {
        clients.forEach(c => {
            const tr = document.createElement('tr');
            const proj = c.type_installation || 'Non défini';
            const montant = c.montant_devis ? formatCurrency(c.montant_devis) : '-';
 
            tr.innerHTML = `
                <td><strong class="client-link" onclick="editClient(${c.id})">${c.nom}</strong><br><small>${c.ville || ''} ${c.code_postal ? '(' + c.code_postal + ')' : ''}</small></td>
                <td>${c.telephone || '-'}</td>
                <td>${proj}</td>
                <td><span class="${getBadgeClass(c.statut_commercial)}">${c.statut_commercial || 'À contacter'}</span></td>
                <td>${montant}</td>
                <td><span class="${getBadgeClass(c.statut_chantier)}">${c.statut_chantier || 'En attente'}</span></td>
                <td class="action-btns">
                    <button class="icon-btn" onclick="editClient(${c.id})"><i class="fa-solid fa-pen-to-square"></i></button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }
 
    if (signedTableBody) {
        const signedClientsList = clients.filter(c => c.statut_commercial && c.statut_commercial.includes('Signé'));
        if (signedClientsList.length === 0) {
            signedTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 30px;">Aucun client signé trouvé.</td></tr>';
        } else {
            signedClientsList.forEach(c => {
                const tr = document.createElement('tr');
                const proj = c.type_installation || 'Non défini';
                const montant = c.montant_devis ? formatCurrency(c.montant_devis) : '-';
 
                tr.innerHTML = `
                    <td><strong class="client-link" onclick="editClient(${c.id})">${c.nom}</strong><br><small>${c.ville || ''} ${c.code_postal ? '(' + c.code_postal + ')' : ''}</small></td>
                    <td>${c.telephone || '-'}</td>
                    <td>${proj}</td>
                    <td>${montant}</td>
                    <td><span class="${getBadgeClass(c.statut_chantier)}">${c.statut_chantier || 'En attente'}</span></td>
                    <td class="action-btns">
                        <button class="icon-btn" onclick="editClient(${c.id})"><i class="fa-solid fa-pen-to-square"></i></button>
                    </td>
                `;
                signedTableBody.appendChild(tr);
            });
        }
    }
}
 
function renderChantierBoard() {
    const kanbanBoard = document.getElementById('kanbanBoard');
    const loadingChantier = document.getElementById('loadingChantier');
    if (!kanbanBoard) return;

    if (loadingChantier) loadingChantier.style.display = 'none';

    // Clear containers
    const containers = {
        'planif': document.getElementById('cards-planif'),
        'cours': document.getElementById('cards-cours'),
        'final': document.getElementById('cards-final')
    };
    
    Object.values(containers).forEach(c => c.innerHTML = '');
    
    // Reset counts
    const counts = { 'planif': 0, 'cours': 0, 'final': 0 };

    const technicalClients = allClientsData.filter(c => 
        (c.statut_commercial && c.statut_commercial.includes('Signé')) || 
        (c.statut_chantier && c.statut_chantier !== 'En attente')
    );

    technicalClients.forEach(c => {
        let colKey = 'planif';
        if (c.statut_chantier === 'En cours') colKey = 'cours';
        if (c.statut_chantier === 'Terminé') colKey = 'final';
        
        counts[colKey]++;
        
        const card = document.createElement('div');
        card.className = 'kanban-card';
        
        const debutStr = c.date_debut ? new Date(c.date_debut).toLocaleDateString('fr-FR') : 'Non planifié';
        
        // Technical Status Dot Colors
        const getTechColor = (val) => {
            if (!val || val === 'Non démarré') return 'circle-red';
            if (val === 'Dossier envoyé') return 'circle-orange';
            return 'circle-green';
        };

        const enedisColor = c.enedis ? 'circle-green' : 'circle-red';
        const consuelColor = getTechColor(c.consuel);

        card.innerHTML = `
            <div class="card-client-name">${c.nom}</div>
            <div class="card-tags">
                <span class="card-tag tag-info"><i class="fa-solid fa-solar-panel"></i> ${c.type_installation || '-'}</span>
                ${c.batterie === 'Oui' ? '<span class="card-tag tag-warning"><i class="fa-solid fa-battery-full"></i> Batterie</span>' : ''}
            </div>
            
            <div class="tech-status-dots">
                <div class="tech-dot" title="Dossier Enedis : ${c.enedis || 'Non renseigné'}">
                    <div class="status-circle ${enedisColor}"></div> Enedis
                </div>
                <div class="tech-dot" title="Consuel : ${c.consuel || 'Non démarré'}">
                    <div class="status-circle ${consuelColor}"></div> Consuel
                </div>
            </div>

            <div class="tech-indicators-mini" style="margin-top: 10px; display: flex; gap: 6px; padding: 8px; background: rgba(255,255,255,0.5); border-radius: 6px;">
                <div style="display: flex; align-items: center; gap: 4px; font-size: 11px;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${c.dp_valide ? '#22c55e' : '#e2e8f0'};"></span> DP
                </div>
                <div style="display: flex; align-items: center; gap: 4px; font-size: 11px;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${c.commande_passee ? '#3b82f6' : '#e2e8f0'};"></span> CMD
                </div>
                <div style="display: flex; align-items: center; gap: 4px; font-size: 11px;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${c.pose_programmee ? '#a855f7' : '#e2e8f0'};"></span> POS
                </div>
            </div>

            <div class="card-footer">
                <div><i class="fa-solid fa-calendar-day"></i> ${debutStr}</div>
                <div class="card-actions">
                    <button class="btn-round" onclick="openTechnicalModal(${c.id})" title="Mise à jour technique"><i class="fa-solid fa-wrench"></i></button>
                    <button class="btn-round" onclick="editClient(${c.id})" title="Fiche complète"><i class="fa-solid fa-eye"></i></button>
                </div>
            </div>
        `;
        containers[colKey].appendChild(card);
    });

    // Update count badges
    document.getElementById('count-planif').innerText = counts['planif'];
    document.getElementById('count-cours').innerText = counts['cours'];
    document.getElementById('count-final').innerText = counts['final'];
}

function renderChantierTable() {
    renderChantierBoard(); // Redirection to new Kanban board
}

function openTechnicalModal(id) {
    const client = allClientsData.find(c => c.id === id);
    if (!client) return;

    document.getElementById('tech-client-id').value = id;
    document.getElementById('tech-client-nom').innerText = client.nom;
    document.getElementById('tech-statut-chantier').value = client.statut_chantier || 'En attente';
    document.getElementById('tech-date-debut').value = client.date_debut || '';
    document.getElementById('tech-enedis').value = client.enedis || '';
    document.getElementById('tech-consuel').value = client.consuel || 'Non démarré';
    document.getElementById('tech-observations').value = client.observations || '';

    // Indicators
    document.getElementById('tech-dp-valide').checked = !!client.dp_valide;
    document.getElementById('tech-commande-passee').checked = !!client.commande_passee;
    document.getElementById('tech-pose-programmee').checked = !!client.pose_programmee;

    document.getElementById('modal-technical').style.display = 'flex';
}

function closeTechnicalModal() {
    document.getElementById('modal-technical').style.display = 'none';
}

async function saveTechnicalInfo() {
    const id = document.getElementById('tech-client-id').value;
    const client = allClientsData.find(c => c.id == id);
    if (!client) return;

    // Get values from simplified form
    const form = document.getElementById('technicalForm');
    const formData = new FormData(form);
    const updates = Object.fromEntries(formData.entries());

    // Explicitly handle checkboxes (FormData only includes them if checked)
    updates.dp_valide = document.getElementById('tech-dp-valide').checked ? 1 : 0;
    updates.commande_passee = document.getElementById('tech-commande-passee').checked ? 1 : 0;
    updates.pose_programmee = document.getElementById('tech-pose-programmee').checked ? 1 : 0;

    // Merge with existing client data to avoid overwriting everything else
    const payload = { ...client, ...updates };
    
    try {
        const res = await fetch(`${API_URL}/clients/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeTechnicalModal();
            fetchClients(); // Refresh data and board
        } else {
            alert("Erreur lors de la mise à jour technique");
        }
    } catch (err) {
        console.error(err);
        alert("Erreur réseau");
    }
}

function openAcomptesModal(id) {
    const client = allClientsData.find(c => c.id === id);
    if (!client) return;

    document.getElementById('acompte-client-id').value = id;
    document.getElementById('acompte-client-nom').innerText = client.nom;
    
    document.getElementById('acompte-1-montant').value = client.acompte_1_montant || '';
    document.getElementById('acompte-1-date').value = client.acompte_1_date || '';
    document.getElementById('acompte-2-montant').value = client.acompte_2_montant || '';
    document.getElementById('acompte-2-date').value = client.acompte_2_date || '';
    document.getElementById('acompte-solde-montant').value = client.solde_montant || '';
    document.getElementById('acompte-solde-date').value = client.solde_date || '';

    document.getElementById('modal-acomptes').style.display = 'flex';
}

function closeAcomptesModal() {
    document.getElementById('modal-acomptes').style.display = 'none';
}

async function saveAcomptesInfo() {
    const id = document.getElementById('acompte-client-id').value;
    const client = allClientsData.find(c => c.id == id);
    if (!client) return;

    const updates = {
        acompte_1_montant: document.getElementById('acompte-1-montant').value ? parseFloat(document.getElementById('acompte-1-montant').value) : null,
        acompte_1_date: document.getElementById('acompte-1-date').value || null,
        acompte_2_montant: document.getElementById('acompte-2-montant').value ? parseFloat(document.getElementById('acompte-2-montant').value) : null,
        acompte_2_date: document.getElementById('acompte-2-date').value || null,
        solde_montant: document.getElementById('acompte-solde-montant').value ? parseFloat(document.getElementById('acompte-solde-montant').value) : null,
        solde_date: document.getElementById('acompte-solde-date').value || null
    };

    const payload = { ...client, ...updates };
    
    try {
        const res = await fetch(`${API_URL}/clients/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeAcomptesModal();
            fetchClients(); // Refresh data
        } else {
            alert("Erreur lors de la mise à jour des acomptes");
        }
    } catch (err) {
        console.error(err);
        alert("Erreur réseau");
    }
}

function renderFacturationTable() {
    const facturationBody = document.getElementById('facturationTableBody');
    const loadingFact = document.getElementById('loadingFacturation');
    if (!facturationBody) return;

    if (loadingFact) loadingFact.style.display = 'none';
    facturationBody.innerHTML = '';

    const signedClients = allClientsData.filter(c => c.statut_commercial && c.statut_commercial.includes('Signé'));
    if (signedClients.length === 0) {
        facturationBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 30px;">Aucun devis signé trouvé.</td></tr>';
    } else {
        let totalDevis = 0, totalA1 = 0, totalA2 = 0, totalSolde = 0, totalReste = 0;

        signedClients.forEach(c => {
            const tr = document.createElement('tr');
            const a1 = c.acompte_1_montant || 0;
            const a2 = c.acompte_2_montant || 0;
            const s = c.solde_montant || 0;
            const devis = c.montant_devis || 0;
            const reste = devis - a1 - a2 - s;

            const d_a1 = c.acompte_1_date ? `<br><small class="badge badge-success" style="font-size:10px;">Le ${new Date(c.acompte_1_date).toLocaleDateString('fr-FR')}</small>` : '';
            const d_a2 = c.acompte_2_date ? `<br><small class="badge badge-success" style="font-size:10px;">Le ${new Date(c.acompte_2_date).toLocaleDateString('fr-FR')}</small>` : '';
            const d_s = c.solde_date ? `<br><small class="badge badge-success" style="font-size:10px;">Le ${new Date(c.solde_date).toLocaleDateString('fr-FR')}</small>` : '';
            
            // Indicators rendering
            const dotStyle = "width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin: 0 4px;";
            const dpDot = `<span title="DP Validée" style="${dotStyle} background-color: ${c.dp_valide ? '#22c55e' : '#e2e8f0'};"></span>`;
            const cmdDot = `<span title="Commande Passée" style="${dotStyle} background-color: ${c.commande_passee ? '#3b82f6' : '#e2e8f0'};"></span>`;
            const poseDot = `<span title="Pose Programmée" style="${dotStyle} background-color: ${c.pose_programmee ? '#a855f7' : '#e2e8f0'};"></span>`;

            const resteColor = reste <= 0 ? (reste < 0 ? '#ef4444' : '#22c55e') : '#f97316';
            const resteLabel = reste <= 0 ? (reste < 0 ? '⚠️ ' : '✅ ') : '';

            tr.innerHTML = `
                <td><strong class="client-link" onclick="editClient(${c.id})">${c.nom}</strong></td>
                <td style="text-align: center;">
                    <div style="display: flex; justify-content: center; gap: 4px;">
                        ${dpDot}${cmdDot}${poseDot}
                    </div>
                    <div style="font-size: 8px; color: var(--gray-400); margin-top: 4px; display: flex; justify-content: space-around;">
                        <span>DP</span><span>CMD</span><span>POS</span>
                    </div>
                </td>
                <td><strong>${formatCurrency(devis)}</strong></td>
                <td onclick="openAcomptesModal(${c.id})" style="cursor:pointer; transition: 0.2s;" onmouseover="this.style.backgroundColor='var(--gray-100)'" onmouseout="this.style.backgroundColor='transparent'">${a1 > 0 ? (formatCurrency(a1) + d_a1) : '-'}</td>
                <td onclick="openAcomptesModal(${c.id})" style="cursor:pointer; transition: 0.2s;" onmouseover="this.style.backgroundColor='var(--gray-100)'" onmouseout="this.style.backgroundColor='transparent'">${a2 > 0 ? (formatCurrency(a2) + d_a2) : '-'}</td>
                <td onclick="openAcomptesModal(${c.id})" style="cursor:pointer; transition: 0.2s;" onmouseover="this.style.backgroundColor='var(--gray-100)'" onmouseout="this.style.backgroundColor='transparent'">${s > 0 ? (formatCurrency(s) + d_s) : '-'}</td>
                <td><strong style="color:${resteColor};">${resteLabel}${formatCurrency(reste)}</strong></td>
                <td class="action-btns">
                    <button class="btn-round" onclick="openTechnicalModal(${c.id})" title="Mise à jour technique"><i class="fa-solid fa-wrench"></i></button>
                </td>
            `;
            facturationBody.appendChild(tr);

            totalDevis += devis;
            totalA1 += a1;
            totalA2 += a2;
            totalSolde += s;
            totalReste += reste;
        });

        const tfoot = document.getElementById('facturationTableFoot');
        if (tfoot) {
            const totalResteColor = totalReste <= 0 ? (totalReste < 0 ? '#ef4444' : '#22c55e') : '#f97316';
            tfoot.innerHTML = `
                <tr style="border-top: 2px solid var(--gray-300); font-size: 0.95rem;">
                    <td colspan="2" style="text-align:right; text-transform:uppercase; padding:12px 16px; color:var(--gray-600);">TOTAL :</td>
                    <td style="padding:12px 16px; font-weight:700;">${formatCurrency(totalDevis)}</td>
                    <td style="padding:12px 16px; color:#3b82f6; font-weight:600;">${formatCurrency(totalA1)}</td>
                    <td style="padding:12px 16px; color:#3b82f6; font-weight:600;">${formatCurrency(totalA2)}</td>
                    <td style="padding:12px 16px; color:#8b5cf6; font-weight:600;">${formatCurrency(totalSolde)}</td>
                    <td style="padding:12px 16px; color:${totalResteColor}; font-weight:700; font-size:1rem;">${formatCurrency(totalReste)}</td>
                    <td></td>
                </tr>
                <tr style="background:#f0fdf4; border-top:1px solid #bbf7d0;">
                    <td colspan="3" style="padding:10px 16px; color:var(--gray-500); font-size:0.82rem;">💡 Reste à payer = Montant TTC − Acompte 1 − Acompte 2 − Solde reçu</td>
                    <td colspan="2" style="padding:10px 16px; color:#3b82f6; font-size:0.85rem;">Total encaissé : <strong>${formatCurrency(totalA1 + totalA2 + totalSolde)}</strong></td>
                    <td colspan="2" style="padding:10px 16px; color:${totalResteColor}; font-size:0.85rem;">À recevoir : <strong>${formatCurrency(Math.max(0, totalReste))}</strong></td>
                </tr>
            `;
        }
    }
}

async function fetchClients() {
    try {
        const response = await fetch(`${API_URL}/clients`);
        const data = await response.json();
        allClientsData = data.clients || [];
        const clients = allClientsData;

        const loadingEl = document.getElementById('loadingClients');
        if (loadingEl) loadingEl.style.display = 'none';

        if (!currentSortColumn) {
            renderFullClientsTable();
            renderFacturationTable();
        } else {
            applySort();
        }

        // Dashboard : derniers clients
        const dashTableBody = document.querySelector('#view-dashboard tbody');
        if (dashTableBody) {
            dashTableBody.innerHTML = '';
            const latestClients = clients.slice(0, 5);
            if (latestClients.length === 0) {
                dashTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Aucun rendez-vous récent</td></tr>';
            } else {
                latestClients.forEach(c => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong class="client-link" onclick="editClient(${c.id})">${c.nom}</strong><br><small>${c.ville || ''}</small></td>
                        <td>${c.date_rdv ? new Date(c.date_rdv).toLocaleDateString('fr-FR') : '-'}</td>
                        <td>${c.type_installation || '-'}</td>
                        <td><span class="${getBadgeClass(c.statut_commercial)}">${c.statut_commercial || '-'}</span></td>
                        <td><span class="${getBadgeClass(c.statut_chantier)}">${c.statut_chantier || '-'}</span></td>
                        <td class="action-btns">
                            <button class="icon-btn" onclick="editClient(${c.id})"><i class="fa-solid fa-pen-to-square"></i></button>
                        </td>
                    `;
                    dashTableBody.appendChild(tr);
                });
            }
        }
 
        // Facturation & Chantier
        renderFacturationTable();
        renderChantierTable();

        // Compteurs dashboard
        document.getElementById('stat-total-clients').innerText = clients.length;
        document.getElementById('stat-chantiers-cours').innerText = clients.filter(c => c.statut_chantier === 'En cours').length;
        document.getElementById('stat-installs-6k').innerText = clients.filter(c => c.type_installation === '6 kWc').length;

        const caSigne = clients
            .filter(c => c.statut_commercial && c.statut_commercial.includes('Signé'))
            .reduce((acc, cur) => acc + (cur.montant_devis || 0), 0);
        document.getElementById('stat-ca-signe').innerText = formatCurrency(caSigne);

    } catch (e) {
        console.error("Erreur de récupération des clients:", e);
        const loadingEl = document.getElementById('loadingClients');
        if (loadingEl) loadingEl.style.display = 'none';
        const tableBody = document.getElementById('fullClientsTableBody');
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red; padding:30px;"><strong>❌ Erreur : Impossible de contacter le serveur.</strong><br>Assurez-vous que le serveur tourne (<code>node server.js</code>) puis rechargez la page.</td></tr>';
    }
}

async function submitForm(e) {
    console.log('🚀 Tentative d\'enregistrement du formulaire...');
    e.preventDefault();

    const formObj = document.getElementById('clientForm');
    const btn = formObj.querySelector('button[type="submit"]');
    const originalBtnContent = btn.innerHTML;

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enregistrement...';

        const formData = new FormData(formObj);
        const payload = Object.fromEntries(formData.entries());

        // Forcer les valeurs des checkboxes (non présentes dans FormData si non cochées)
        payload.dp_valide = formObj.elements['dp_valide'].checked ? 1 : 0;
        payload.commande_passee = formObj.elements['commande_passee'].checked ? 1 : 0;
        payload.pose_programmee = formObj.elements['pose_programmee'].checked ? 1 : 0;

        console.log('📦 Payload envoyé:', payload);

        const method = currentEditId ? 'PUT' : 'POST';
        const url = currentEditId ? `${API_URL}/clients/${currentEditId}` : `${API_URL}/clients`;

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log('📡 Statut réponse:', res.status);

        if (res.ok) {
            console.log('✅ Succès !');
            alert(currentEditId ? 'Dossier modifié avec succès !' : 'Dossier enregistré avec succès !');
            formObj.reset();
            currentEditId = null;
            switchView('dashboard');
            fetchClients();
        } else {
            const errorData = await res.json();
            console.error('❌ Erreur serveur:', errorData);
            alert('Erreur lors de l\'enregistrement : ' + (errorData.error || 'Erreur inconnue'));
        }
    } catch (err) {
        console.error('🔥 Erreur réseau/JS:', err);
        alert('Erreur réseau ou serveur inaccessible : ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnContent;
    }
}

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Attach form submit
    const form = document.getElementById('clientForm');
    form.removeAttribute('onsubmit');
    form.addEventListener('submit', submitForm);

    // Auto-calculate TTC
    const prixHtInput = document.querySelector('input[name="prix_installation_ht"]');
    const tvaSelect = document.querySelector('select[name="taux_tva"]');
    const montantDevisInput = document.querySelector('input[name="montant_devis"]');

    function calculateTTC() {
        const ht = parseFloat(prixHtInput.value) || 0;
        const tva = parseFloat(tvaSelect.value) || 0;
        if (ht > 0) montantDevisInput.value = (ht * (1 + tva / 100)).toFixed(2);
    }
    prixHtInput.addEventListener('input', calculateTTC);
    tvaSelect.addEventListener('change', calculateTTC);

    // Calcul reste à payer
    const acompte1Input = document.querySelector('input[name="acompte_1_montant"]');
    const acompte2Input = document.querySelector('input[name="acompte_2_montant"]');
    const soldeInput = document.querySelector('input[name="solde_montant"]');

    function calculateReste() {
        const ttc = parseFloat(montantDevisInput.value) || 0;
        const a1 = parseFloat(acompte1Input.value) || 0;
        const a2 = parseFloat(acompte2Input.value) || 0;
        const solde = parseFloat(soldeInput.value) || 0;
        const reste = ttc - a1 - a2 - solde;

        let indicator = document.getElementById('reste-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'reste-indicator';
            indicator.style.cssText = 'margin-top:12px; padding:12px 18px; border-radius:10px; font-weight:600; font-size:0.95rem; display:flex; align-items:center; gap:10px; transition:all 0.3s;';
            soldeInput.closest('.form-grid').after(indicator);
        }

        if (ttc <= 0) { indicator.style.display = 'none'; return; }
        indicator.style.display = 'flex';

        const totalEncaisse = a1 + a2 + solde;
        if (reste <= 0) {
            indicator.style.background = '#f0fdf4';
            indicator.style.border = '1px solid #86efac';
            indicator.style.color = '#16a34a';
            indicator.innerHTML = `<i class="fa-solid fa-circle-check"></i> Entièrement payé ! Total encaissé : <strong>${formatCurrency(totalEncaisse)}</strong>`;
        } else {
            indicator.style.background = '#fff7ed';
            indicator.style.border = '1px solid #fdba74';
            indicator.style.color = '#c2410c';
            indicator.innerHTML = `<i class="fa-solid fa-clock"></i> Reste à payer : <strong>${formatCurrency(reste)}</strong> &nbsp;|&nbsp; Encaissé : ${formatCurrency(totalEncaisse)} / ${formatCurrency(ttc)}`;
        }
    }

    acompte1Input.addEventListener('input', calculateReste);
    acompte2Input.addEventListener('input', calculateReste);
    soldeInput.addEventListener('input', calculateReste);
    montantDevisInput.addEventListener('input', calculateReste);

    // Chargement initial
    loadCommerciaux();
    loadInstallations();
    fetchClients();
});
