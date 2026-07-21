/**
 * Cada reunião tem uma visibilidade escolhida por quem criou:
 *  - 'todos'   -> qualquer pessoa logada vê
 *  - 'dono'    -> só quem criou + o dono (padrão, preserva o comportamento anterior)
 *  - 'privado' -> só quem criou, nem o dono vê
 * Quem criou sempre vê a própria reunião, e reuniões de exemplo (demo) são sempre visíveis.
 */
function visibleMeetings(allMeetings, user) {
  if (!user) return [];
  return allMeetings.filter(m => {
    if (m.demo) return true;
    if (m.criadoPor === user.id) return true;
    if (user.role === 'dono') return m.visibilidade !== 'privado';
    return m.visibilidade === 'todos';
  });
}

/** Dono pode editar/apagar qualquer reunião. Funcionário só as que ele mesmo criou. */
function canModifyMeeting(meeting, user) {
  if (!user || !meeting) return false;
  if (user.role === 'dono') return true;
  return meeting.criadoPor === user.id;
}

module.exports = { visibleMeetings, canModifyMeeting };
