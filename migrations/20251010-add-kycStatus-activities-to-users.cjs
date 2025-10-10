module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'activities', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: []
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'activities');
  }
};
