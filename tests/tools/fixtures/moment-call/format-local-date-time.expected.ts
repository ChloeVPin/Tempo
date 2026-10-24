import { LocalDate, LocalDateTime, LocalTime } from '@chloevpin/tempo';
import { format } from '@chloevpin/tempo/format';

const moment = require('moment');

const time = format(LocalDateTime.combine(LocalDate.parse('2026-01-01'), LocalTime.of(0, 0)), 'yyyy-MM-dd HH:mm:ss');
