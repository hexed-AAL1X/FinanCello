import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  constructor(private router: Router, private route: ActivatedRoute) {}

  goToCategories() {
    this.router.navigate(['categories'], { relativeTo: this.route });
  }

  goToSpendingLimit() {
    this.router.navigate(['spending-limit'], { relativeTo: this.route });
  }




}
