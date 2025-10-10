module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'kycStatus', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'unverified'
    });
    await queryInterface.addColumn('users', 'activities', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: []
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'kycStatus');
    await queryInterface.removeColumn('users', 'activities');
  }
};
