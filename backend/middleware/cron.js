const cron = require('node-cron');
const { Op } = require('sequelize');
const Task = require('../models/task.model');

const startCronJobs = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const updated = await Task.update(
        { status: 'LATE' },
        {
          where: {
            deadline: { [Op.lt]: today },
            status: { [Op.in]: ['TODO', 'IN_PROGRESS'] },
            freq_type: { [Op.ne]: 'weekly_until_done' }
          }
        }
      );
      console.log(`🕛 [CRON] ${updated[0]} tâche(s) marquée(s) EN RETARD`);
    } catch (err) {
      console.error('❌ [CRON] Erreur marquage retard:', err.message);
    }
  });

  cron.schedule('0 1 * * *', async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deleted = await Task.destroy({
        where: {
          status: 'DONE',
          completed_at: { [Op.lt]: thirtyDaysAgo },
          freq_type: { [Op.ne]: 'weekly_until_done' }
        }
      });
      console.log(`🗑️  [CRON] ${deleted} tâche(s) terminée(s) supprimée(s) (>30j)`);
    } catch (err) {
      console.error('❌ [CRON] Erreur suppression auto:', err.message);
    }
  });

  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const todayStr = now.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const urgentTasks = await Task.findAll({
        where: {
          deadline: { [Op.between]: [todayStr, tomorrowStr] },
          status: { [Op.in]: ['TODO', 'IN_PROGRESS'] },
          freq_type: { [Op.ne]: 'weekly_until_done' }
        }
      });

      if (urgentTasks.length > 0) {
        console.log(`⚠️  [CRON] ${urgentTasks.length} tâche(s) urgente(s) dans les prochaines 24h:`);
        urgentTasks.forEach(t => console.log(`   - "${t.title}" (échéance: ${t.deadline})`));
      }
    } catch (err) {
      console.error('❌ [CRON] Erreur vérification urgence:', err.message);
    }
  });

  cron.schedule('0 6 * * 1', () => {
    console.log('📅 [CRON] Nouvelle semaine — créneaux objectifs recalculés à la consultation du planning');
  });

  console.log('⏰ Tâches automatiques (cron) démarrées');
};

module.exports = { startCronJobs };
