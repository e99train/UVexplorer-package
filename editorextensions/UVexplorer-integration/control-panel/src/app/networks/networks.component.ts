import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NetworkSummary } from 'model/uvx/network';
import { isListNetworksMessage, listNetworksMessageToNetworkSummaries } from 'model/message';
import { NgForOf, NgIf } from '@angular/common';
import { DevicesComponent } from '../devices/devices.component';

@Component({
  selector: 'networks',
  standalone: true,
  imports: [FormsModule, NgForOf, NgIf, DevicesComponent],
  templateUrl: './networks.component.html'
})
export class NetworksComponent {
  title = 'networks';
  network_summaries: NetworkSummary[] = [];
  selectedNetwork: NetworkSummary = {
    guid: '',
    name: '',
    description: '',
    agent_summaries: [],
    created_time: '',
    modified_time: ''
  };
  network_loaded = false;

  constructor() {
    window.addEventListener('message', (e) => {
      console.log('Received a message from the parent.');
      console.log(e.data);
      try {
        if (isListNetworksMessage(e.data)) {
          this.network_summaries = listNetworksMessageToNetworkSummaries(e.data);
        }
      } catch (e) {
        console.error(e);
      }
    });
  }

  loadNetwork() {
    parent.postMessage(
      {
        action: 'loadNetwork',
        name: this.selectedNetwork.name,
        network_guid: this.selectedNetwork.guid
      },
      '*'
    );

    this.network_loaded = true;
  }
}
