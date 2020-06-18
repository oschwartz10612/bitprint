import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { GenerateComponent } from './generate/generate.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { HomeComponent } from './home/home.component';
import { TermsComponent } from './terms/terms.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { SupportComponent } from './support/support.component';
import { RefundComponent } from './refund/refund.component';
import { AboutComponent } from './about/about.component';
import { SuccessComponent } from './success/success.component';

const routes: Routes = [
  { path: 'generate', component: GenerateComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'home', component: HomeComponent },
  { path: 'terms', component: TermsComponent },
  { path: 'privacy', component: PrivacyComponent },
  { path: 'support', component: SupportComponent },
  { path: 'refund', component: RefundComponent },
  { path: 'about', component: AboutComponent },
  { path: 'success', component: SuccessComponent },
  { path: '', component: HomeComponent },
  { path: '**', component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
