/** Dono vê tudo. Funcionário só vê as reuniões que ele mesmo criou, mais as de exemplo (demo). */
function visibleMeetings(allMeetings, user) {
  if (!user || user.role === 'dono') return allMeetings;
  return allMeetings.filter(m => m.demo || m.criadoPor === user.id);
}

/** Dono pode editar/apagar qualquer reunião. Funcionário só as que ele mesmo criou. */
function canModifyMeeting(meeting, user) {
  if (!user || !meeting) return false;
  if (user.role === 'dono') return true;
  return meeting.criadoPor === user.id;
}

module.exports = { visibleMeetings, canModifyMeeting };
