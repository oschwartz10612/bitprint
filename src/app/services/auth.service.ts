import { Injectable } from '@angular/core';
import { auth } from 'firebase/app';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';

import { Observable, of } from 'rxjs';
import { switchMap, first } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  user$: Observable<any>;

  constructor( public afAuth: AngularFireAuth, private afs: AngularFirestore) { 

      this.user$ = this.afAuth.authState.pipe(
        switchMap(user => {
            // Logged in
          if (user) {
            return this.afs.doc(`users/${user.uid}`).valueChanges();
          } else {
            // Logged out
            return of(null);
          }
        })
      )
    }

  isLoggedIn() {
    return this.afAuth.authState.pipe(first()).toPromise();
  }

  loginAnon() {
    return new Promise(async (resolve, reject) => {
      await this.afAuth.auth.signInAnonymously();
      const user = await this.isLoggedIn();
      await this.afs.doc(`users/${user.uid}`).set({
        uid: user.uid,
        currentImg: '',
        cart: []
      });
      resolve();
    });
  }
}
