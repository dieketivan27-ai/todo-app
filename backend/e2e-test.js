const { app } = require('./app');
const { sequelize, connectDB } = require('./config/database');
const http = require('http');

async function runE2ETest() {
  console.log('--- DEBUT DU TEST DE BOUT EN BOUT NEON ---');
  await connectDB();
  await sequelize.sync({ alter: true });
  console.log('1. Base de donnees Neon connectee et synchronisee');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`2. Serveur Express demarre sur port ${port}`);

  const baseUrl = `http://127.0.0.1:${port}/api`;
  const testEmail = `neon-test-${Date.now()}@test.com`;
  const testPassword = 'Password123!';

  // 1. Inscription
  console.log('3. Inscription d un utilisateur de test...');
  let res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Ivan Neon Test', email: testEmail, password: testPassword })
  });
  let data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error('Echec inscription: ' + JSON.stringify(data));
  }
  const token = data.token;
  console.log('   Utilisateur inscrit avec succes ID:', data.user.id);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Creer une tache
  console.log('4. Creation d une tache...');
  res = await fetch(`${baseUrl}/tasks`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Tache Test Neon E2E',
      description: 'Test complet sur Neon PostgreSQL',
      priority: 'HIGH',
      category: 'Projet Neon'
    })
  });
  data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error('Echec creation tache: ' + JSON.stringify(data));
  }
  const createdTask = data.data;
  console.log(`   Tache creee avec succes! ID: ${createdTask.id}, Titre: "${createdTask.title}", Priorite: ${createdTask.priority}`);

  // 3. Modifier la tache
  console.log(`5. Modification de la tache ID ${createdTask.id}...`);
  res = await fetch(`${baseUrl}/tasks/${createdTask.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Tache Test Neon E2E - Modifiee avec succes',
      status: 'IN_PROGRESS'
    })
  });
  data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error('Echec modification tache: ' + JSON.stringify(data));
  }
  const updatedTask = data.data;
  console.log(`   Tache modifiee avec succes! Titre: "${updatedTask.title}", Statut: ${updatedTask.status}`);

  // 4. Supprimer la tache
  console.log(`6. Suppression de la tache ID ${createdTask.id}...`);
  res = await fetch(`${baseUrl}/tasks/${createdTask.id}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error('Echec suppression tache: ' + JSON.stringify(data));
  }
  console.log(`   Tache supprimee avec succes! Message: ${data.message}`);

  // 5. Verifier que la tache n existe plus
  res = await fetch(`${baseUrl}/tasks/${createdTask.id}`, {
    headers: authHeaders
  });
  if (res.status === 404) {
    console.log('7. Verification: La tache a bien disparu de la base (404 Not Found)');
  } else {
    const checkData = await res.json();
    console.log('7. Verification statut:', res.status, checkData);
  }

  // Nettoyage de l'utilisateur de test dans la base Neon
  const User = require('./models/user.model');
  await User.destroy({ where: { email: testEmail } });
  console.log('8. Utilisateur de test supprime de la base Neon.');

  server.close();
  await sequelize.close();
  console.log('--- TEST E2E TERMINE AVEC SUCCES A 100% ---');
}

runE2ETest().catch(err => {
  console.error('ERREUR TEST E2E:', err);
  process.exit(1);
});
