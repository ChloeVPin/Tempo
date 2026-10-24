import { LocalDate } from '@chloevpin/tempo';
import { format } from '@chloevpin/tempo/format';

const moment = require('moment');

const next = format(LocalDate.parse('2026-01-01').plus({ days: 1 }), 'yyyy-MM-dd');
