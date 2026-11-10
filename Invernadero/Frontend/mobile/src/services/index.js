/**
 * Punto de entrada de la capa de servicios.
 * Las pantallas deben importar desde aquí (o desde cada servicio).
 */
export { api, ApiError } from './api';
export * as authService from './authService';
export * as sensorsService from './sensorsService';
export * as wateringService from './wateringService';
export * as plantsService from './plantsService';
export * as alertsService from './alertsService';
export * as galleryService from './galleryService';
export * as profileService from './profileService';
