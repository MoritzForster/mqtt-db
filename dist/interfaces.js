"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.is_iMQTTPayload = void 0;
;
function is_iMQTTPayload(obj) {
    if ((typeof obj === 'object') && (typeof obj.timestamp === 'string') && (typeof obj.value === 'string')) {
        return true;
    }
    else {
        return false;
    }
}
exports.is_iMQTTPayload = is_iMQTTPayload;
//# sourceMappingURL=interfaces.js.map