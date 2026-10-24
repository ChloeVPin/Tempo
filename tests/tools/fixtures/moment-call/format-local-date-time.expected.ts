import { LocalDateTime } from '@chloevpin/tempo';
import { format } from '@chloevpin/tempo/format';

const moment = require('moment');

const time = format(LocalDateTime.parse('2026-01-01'), 'yyyy-MM-dd HH:mm:ss');
