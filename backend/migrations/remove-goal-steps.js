/**
 * Supprime l'ancien système GoalStep : tâches d'étapes, colonne goal_step_id, table goal_steps.
 * Les objectifs passent en goal_type = 'actions' (variables d'action / Tasks uniquement).
 */
async function runRemoveGoalStepsMigration(sequelize) {
  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') {
    console.log('⏭️  Migration remove-goal-steps ignorée (dialecte non postgres)');
    return;
  }

  try {
    const [tables] = await sequelize.query(`
      SELECT to_regclass('public.goal_steps') AS goal_steps,
             EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_name = 'tasks' AND column_name = 'goal_step_id'
             ) AS has_goal_step_id
    `);

    const row = tables[0] || {};
    const hasStepsTable = row.goal_steps !== null;
    const hasGoalStepCol = row.has_goal_step_id === true;

    if (hasGoalStepCol) {
      await sequelize.query('DELETE FROM tasks WHERE goal_step_id IS NOT NULL');
      console.log('🧹 Migration: tâches liées aux anciennes étapes supprimées');
      await sequelize.query('ALTER TABLE tasks DROP COLUMN IF EXISTS goal_step_id');
    }

    if (hasStepsTable) {
      await sequelize.query('DROP TABLE IF EXISTS goal_steps CASCADE');
      console.log('🧹 Migration: table goal_steps supprimée');
    }

    await sequelize.query(`
      UPDATE goals SET goal_type = 'actions'
      WHERE goal_type IS NULL OR goal_type = 'habit'
    `);

    console.log('✅ Migration remove-goal-steps terminée');
  } catch (err) {
    console.warn('⚠️  Migration remove-goal-steps:', err.message);
  }
}

module.exports = { runRemoveGoalStepsMigration };
