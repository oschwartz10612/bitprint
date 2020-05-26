import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';
import * as firebase from 'firebase';
import { FormGroup, FormControl, Validators } from '@angular/forms'; 

declare var Stripe: any;

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  uid: string;
  isLoading: boolean = true;
  isChecked: boolean;
  doesAgree: boolean = false;
  sku: string = 'price_HKmThqzVUHVkuI';

  checkoutForm = new FormGroup({
    firstName: new FormControl('', Validators.required),
    lastName: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    address: new FormControl('', Validators.required),
    address2: new FormControl(''),
    country: new FormControl('', Validators.required),
    state: new FormControl('', Validators.required),
    city: new FormControl('', Validators.required),
    zip: new FormControl('', Validators.required),
    method: new FormControl('coinbase', Validators.required)
  });

  constructor(private auth: AuthService, private afs: AngularFirestore, private fns: AngularFireFunctions) { }

  stripe = Stripe('pk_live_JI1vqWHmxn9VfDR5oMg6dV7H001albyXpx');

  ngOnInit() {
    this.auth.user$.subscribe((user) => {
      if (user) {
        this.uid = user.uid;

        this.checkoutForm.patchValue({
          firstName: user.shippingAddress.firstName,
          lastName: user.shippingAddress.lastName,
          email: user.shippingAddress.email,
          address: user.shippingAddress.address,
          address2: user.shippingAddress.address2,
          country: user.shippingAddress.country,
          state: user.shippingAddress.state,
          city: user.shippingAddress.city,
          zip: user.shippingAddress.zip
        });

      } else {

      }
      this.isLoading = false;
    })
  }

  removeItem(item: any) {
    this.afs.doc(`users/${this.uid}`).update({
      cart: firebase.firestore.FieldValue.arrayRemove(item),
      totalCost: firebase.firestore.FieldValue.increment(-item.cost)
    });
  }

  cancelCharge() {
    this.afs.doc(`users/${this.uid}`).update({
      paymentStatus: ''
    });
  }

  agree(event) {
    this.doesAgree = event;
  }

  async onSubmit() {
    console.log(this.checkoutForm.value)
    this.isLoading = true;

    if (this.checkoutForm.value.method == 'coinbase') {
      const callable = this.fns.httpsCallable('createCharge');
      var data = await callable({ form: this.checkoutForm.value }).toPromise();
      window.open(data.uri, "_blank");
    } 

    if (this.checkoutForm.value.method == 'stripe') {

      const callable = this.fns.httpsCallable('stripeCreateCheckout');
      var data = await callable({ form: this.checkoutForm.value }).toPromise();
      
      const {error} = await this.stripe.redirectToCheckout({
        sessionId: data.sessionId
      })

      if (error) {
        alert('There was an error creating the payment. Please contact support.');
      }
    }

    this.isLoading = false;
  }
}
