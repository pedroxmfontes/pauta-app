/**
 * Cada reunião tem uma visibilidade escolhida por quem criou:
 *  - 'todos' -> qualquer pessoa logada vê
 *  - 'dono'  -> só quem criou + os proprietários (padrão)
 * O dono sempre vê tudo, sem exceção — a visibilidade só restringe o que os
 * outros funcionários enxergam entre si. Quem criou sempre vê a própria reunião,
 * e reuniões de exemplo (demo) são sempre visíveis.
 */
function visibleMeetings(allMeetings, user) {
  if (!user) return [];
  if (user.role === 'dono') return allMeetings;
  return allMeetings.filter(m => m.demo || m.criadoPor === user.id || m.visibilidade === 'todos');
}

/** Dono pode editar/apagar qualquer reunião. Funcionário só as que ele mesmo criou. */
function canModifyMeeting(meeting, user) {
  if (!user || !meeting) return false;
  if (user.role === 'dono') return true;
  return meeting.criadoPor === user.id;
}

module.exports = { visibleMeetings, canModifyMeeting };
