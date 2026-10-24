import { format, LocalDateTime } from '@chloevpin/tempo/format';

const moment = require('moment');

const time = format(LocalDateTime.parse(moment('2026-01-01')), 'yyyy-MM-dd HH:mm:ss');
