import { LocalDate } from '@chloevpin/tempo';
import { format } from '@chloevpin/tempo/format';

const moment = require('moment');

const iso = format(LocalDate.parse('2026-01-01'), 'yyyy-MM-dd');
