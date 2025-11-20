"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentStatus = exports.UserRole = void 0;
// User types
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["DOCTOR"] = "DOCTOR";
    UserRole["PATIENT"] = "PATIENT";
    UserRole["NURSE"] = "NURSE";
})(UserRole || (exports.UserRole = UserRole = {}));
// Appointment types
var AppointmentStatus;
(function (AppointmentStatus) {
    AppointmentStatus["SCHEDULED"] = "SCHEDULED";
    AppointmentStatus["CONFIRMED"] = "CONFIRMED";
    AppointmentStatus["COMPLETED"] = "COMPLETED";
    AppointmentStatus["CANCELLED"] = "CANCELLED";
    AppointmentStatus["NO_SHOW"] = "NO_SHOW";
})(AppointmentStatus || (exports.AppointmentStatus = AppointmentStatus = {}));
