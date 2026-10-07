const cron = require('node-cron');
const { Op } = require('sequelize');
const Task = require('../models/task.model');

const startCronJobs = () => {
  // Chaque jour à minuit — marquer les tâches en retard
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

  // Chaque jour à 1h — supprimer les tâches terminées depuis +30 jours
  cron.schedule('0 1 * * *', async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deleted = await Task.destroy({
        where: {
          status: 'DONE',
          completed_at: { [Op.lt]: thirtyDaysAgo }
        }
      });
      console.log(`🗑️  [CRON] ${deleted} tâche(s) terminée(s) supprimée(s) (>30j)`);
    } catch (err) {
      console.error('❌ [CRON] Erreur suppression auto:', err.message);
    }
  });

  // Toutes les heures — vérifier les tâches dont l'échéance approche (dans 24h)
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const todayStr = now.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const urgentTasks = await Task.findAll({
        where: {
          deadline: { [Op.between]: [todayStr, tomorrowStr] },
          status: { [Op.in]: ['TODO', 'IN_PROGRESS'] }
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

  // Chaque lundi à 6h — générer les étapes et tâches futures pour les objectifs actifs
  cron.schedule('0 6 * * 1', async () => {
    try {
      const Goal = require('../models/goal.model');
      const GoalStep = require('../models/goal_step.model');
      const goals = await Goal.findAll();

      const now = new Date();
      const currentWeekNum = getISOWeekForCron(now);
      const startYear = now.getFullYear();

      for (const goal of goals) {
        for (let i = 0; i < 4; i++) {
          let w = currentWeekNum + i;
          let y = startYear;
          if (w > 52) {
            w = w - 52;
            y = startYear + 1;
          }

          // Vérifier si cette étape existe déjà
          const stepExists = await GoalStep.findOne({ where: { goal_id: goal.id, week_number: w, year: y } });
          if (!stepExists) {
            const { start, end } = getWeekBoundsForCron(y, w);
            const step = await GoalStep.create({
              goal_id: goal.id,
              week_number: w,
              year: y,
              week_start: start.toISOString().split('T')[0],
              week_end: end.toISOString().split('T')[0],
              weekly_target: 5,
              description: `Étape semaine ${w} — 1 tâche par jour (Lun-Ven)`,
              status: 'PENDING'
            });

            // Générer 5 tâches quotidiennes (Lundi au Vendredi)
            for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
              const taskDate = new Date(start);
              taskDate.setDate(start.getDate() + dayOffset);
              const dayLabel = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'][dayOffset];

              await Task.create({
                title: `Étape ${goal.title} — S${w} (${dayLabel})`,
                description: `Tâche quotidienne liée à l'objectif : ${goal.title}`,
                priority: 'MEDIUM',
                status: 'TODO',
                category: goal.category,
                deadline: taskDate.toISOString().split('T')[0],
                goal_id: goal.id,
                goal_step_id: step.id
              });
            }
            console.log(`🆕 [CRON] Étape S${w} créée pour l'objectif "${goal.title}"`);
          }
        }
      }
    } catch (err) {
      console.error('❌ [CRON] Erreur génération étapes futures:', err.message);
    }
  });

  // Le planning hebdomadaire des variables d'action est calculé à la volée (GET /api/planning/week).
  cron.schedule('0 6 * * 1', () => {
    console.log('📅 [CRON] Nouvelle semaine — les créneaux objectifs seront régénérés à la prochaine consultation du planning');
  });

  console.log('⏰ Tâches automatiques (cron) démarrées');
};

function getISOWeekForCron(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function getWeekBoundsForCron(year, week) {
  const jan4 = new Date(year, 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const start = new Date(startOfWeek1);
  start.setDate(startOfWeek1.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

module.exports = { startCronJobs };
