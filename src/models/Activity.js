// Activity model definition as a function to avoid circular dependency
export default (sequelize, DataTypes) => {
  const Activity = sequelize.define('Activity', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.STRING, // deposit, withdrawal, trade, kyc, etc.
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: true, // nullable for non-financial events
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true, // completed, pending, failed, approved, etc.
    },
    meta: {
      type: DataTypes.JSON,
      allowNull: true, // extra details (optional)
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'activities',
    timestamps: false,
  });
  return Activity;
}
