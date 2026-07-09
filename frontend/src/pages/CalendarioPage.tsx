import CitasCalendar from '../components/citas/CitasCalendar';
import { useAuth } from '../lib/authContext';
import useFeatureVisit from '../lib/useFeatureVisit';

// Ver calendario/agenda = R-06 (recepción), M-02 (médico), A-07 (admin).
const AGENDA_FEATURE: Record<string, string> = {
  recepcionista: 'R-06',
  medico: 'M-02',
  admin: 'A-07',
};

// El shell (header/nav) lo provee PortalLayout; aquí solo la vista.
export default function CalendarioPage() {
  const { rol } = useAuth();
  useFeatureVisit(rol ? AGENDA_FEATURE[rol] : null);
  return <CitasCalendar />;
}
