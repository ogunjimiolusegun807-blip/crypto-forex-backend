"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'kycStatus', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'unverified',
    });
    await queryInterface.addColumn('users', 'balance', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('users', 'activities', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: {},
    });
    await queryInterface.addColumn('users', 'createdAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'kycStatus');
    await queryInterface.removeColumn('users', 'balance');
    await queryInterface.removeColumn('users', 'activities');
    await queryInterface.removeColumn('users', 'createdAt');
  }
};
