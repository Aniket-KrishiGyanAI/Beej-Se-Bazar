function mapStagesToDates(stages, sowingDate) {
  const base = new Date(sowingDate);

  return stages.map((stage) => {
    const actualStartDate = new Date(base);
    actualStartDate.setDate(base.getDate() + stage.start_day);

    const actualEndDate = new Date(base);
    actualEndDate.setDate(base.getDate() + stage.end_day);

    // Determine status relative to today
    const today = new Date();
    let status = "upcoming";
    if (today >= actualStartDate && today <= actualEndDate) {
      status = "ongoing";
    } else if (today > actualEndDate) {
      status = "completed";
    }

    return {
      ...stage.toObject?.() ?? stage,  // handle Mongoose doc or plain object
      actualStartDate,
      actualEndDate,
      status,
    };
  });
}

export { mapStagesToDates };