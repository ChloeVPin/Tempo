import { ZonedDateTime } from '@chloevpin/tempo';
import { format } from '@chloevpin/tempo/format';

const moment = require('moment');

const zoned = format(ZonedDateTime.parse('2026-01-01T00:00:00Z'), 'yyyy-MM-dd HH:mm:ss');
