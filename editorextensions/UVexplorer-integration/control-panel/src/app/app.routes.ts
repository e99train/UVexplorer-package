import { Routes } from '@angular/router';
import { NetworksComponent } from './networks/networks.component';
import { DevicesComponent } from './devices/devices.component';
import { DeviceDetailComponent } from './device-details/device-detail.component';

export const routes: Routes = [
  {
    path: 'networks',
    component: NetworksComponent
  },
  {
    path: 'devices',
    component: DevicesComponent
  },
  {
    path: 'device-detail',
    component: DeviceDetailComponent
  }
];
