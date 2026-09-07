import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import gsap from 'gsap';
import Lenis from 'lenis';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/Auth.service';
import type { LoginRequest, RegisterRequest } from '../../../models/User';
import { UserType } from '../../../models/User';
import { SnackbarService } from '../../../shared/layout/snackbar/snackbar.service';
import AOS from 'aos';
import Typed from 'typed.js';

import { ViolinParticlesComponent } from '../violin-particles/violin-particles.component';
import { preloadCelloModel } from '../violin-particles/cello-preload';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ReactiveFormsModule, ViolinParticlesComponent],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('landingRoot', { static: true })
  landingRoot!: ElementRef<HTMLElement>;

  @ViewChild('typedElement', { static: false }) typedElement!: ElementRef;
  private typed?: Typed;

  private lenis: Lenis | null = null;
  private rafId: number | null = null;

  private gsapCtx: gsap.Context | null = null;
  private routerEventsSub?: Subscription;

  isHeaderScrolled = false;
  isMobileNavOpen = false;

  isAuthModalOpen = false;
  authTab: 'login' | 'signup' = 'login';
  loginForm!: FormGroup;
  signupForm!: FormGroup;
  showLoginPassword = false;
  showSignupPassword = false;
  showSignupConfirmPassword = false;
  isAuthLoading = false;

  UserType = UserType;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private authService: AuthService,
    private snackbarService: SnackbarService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Precarga el cello en paralelo al resto del landing
    void preloadCelloModel().catch(() => undefined);

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });

    this.signupForm = this.fb.group(
      {
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]],
        confirmPassword: ['', [Validators.required]],
        terms: [false, [Validators.requiredTrue]],
        userType: [UserType.PERSONAL, [Validators.required]],
      },
      { validators: [this.passwordsMatchValidator] },
    );

    this.syncAuthModalFromUrl();
    this.routerEventsSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.syncAuthModalFromUrl());

  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') {
      return;
    }

    AOS.init({
      duration: 800,
      easing: 'ease-out-quart',
      once: true,
      offset: 100,
    });
    setTimeout(() => {
      AOS.refreshHard();
    }, 0);

    const reduceMotion =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduceMotion) {
      this.lenis = new Lenis({
        smoothWheel: true,
        lerp: 0.12,
        wheelMultiplier: 0.9,
      });

      if (this.isAuthModalOpen) {
        this.lenis.stop();
      }

      this.lenis.on('scroll', (e: any) => {
        const scrollY = typeof e?.scroll === 'number' ? e.scroll : window.scrollY;
        this.setHeaderScrolled(scrollY > 40);
      });

      const raf = (time: number) => {
        this.lenis?.raf(time);
        this.rafId = window.requestAnimationFrame(raf);
      };

      this.rafId = window.requestAnimationFrame(raf);
    }

    this.gsapCtx = gsap.context(() => {
      gsap.from('.hero-copy', {
        opacity: 0,
        y: 24,
        duration: 0.95,
        ease: 'power2.out',
      });
      gsap.from('.hero-particles', {
        opacity: 0,
        duration: 1.1,
        delay: 0.1,
        ease: 'power2.out',
      });
    }, this.landingRoot.nativeElement);

    this.initTypewriter();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.lenis) {
      return;
    }

    this.setHeaderScrolled(window.scrollY > 40);
  }

  ngOnDestroy(): void {
    this.gsapCtx?.revert();

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.lenis) {
      this.lenis.destroy();
      this.lenis = null;
    }

    if (this.typed) {
      this.typed.destroy();
    }

    this.routerEventsSub?.unsubscribe();

    this.cdr.markForCheck();
  }

  private setHeaderScrolled(next: boolean): void {
    if (this.isHeaderScrolled === next) {
      return;
    }
    this.isHeaderScrolled = next;
    this.cdr.markForCheck();
  }

  private initTypewriter(): void {
    if (this.typedElement) {
      const options = {
        strings: [
          'Control total',
          'Gestión inteligente',
          'Ahorro eficiente',
          'Presupuestos claros',
          'Metas alcanzables',
          'Análisis profundo',
          'Control total'
        ],
        typeSpeed: 60,
        backSpeed: 40,
        backDelay: 2000,
        loop: true,
        showCursor: false,
        autoInsertCss: true
      };
      
      this.typed = new Typed(this.typedElement.nativeElement, options);
    }
  }

  /**
   * Navega a la página de inicio de sesión
   */
  navigateToLogin(): void {
    this.closeMobileNav();
    this.openAuthModal('login');
  }

  /**
   * Navega a la página de registro
   */
  navigateToRegister(): void {
    this.closeMobileNav();
    this.openAuthModal('signup');
  }

  toggleMobileNav(): void {
    this.isMobileNavOpen = !this.isMobileNavOpen;
    this.cdr.markForCheck();
  }

  closeMobileNav(): void {
    if (!this.isMobileNavOpen) {
      return;
    }
    this.isMobileNavOpen = false;
    this.cdr.markForCheck();
  }

  private syncAuthModalFromUrl(): void {
    const url = this.router.url.split('?')[0];
    const authParamRaw = this.route.snapshot.queryParamMap.get('auth');
    const authParam = authParamRaw === 'login' || authParamRaw === 'signup' ? authParamRaw : null;

    // Rutas /auth/* sin query: normalizar a landing con modal (una sola vez)
    if (!authParam) {
      if (url === '/auth/login' || url === '/auth/register') {
        const tab = url.endsWith('register') ? 'signup' : 'login';
        this.router.navigate(['/'], {
          queryParams: { auth: tab },
          replaceUrl: true,
        });
        return;
      }
    }

    if (authParam === 'login') {
      this.isAuthModalOpen = true;
      this.authTab = 'login';
      this.setPageScrollLocked(true);
      this.cdr.markForCheck();
      return;
    }

    if (authParam === 'signup') {
      this.isAuthModalOpen = true;
      this.authTab = 'signup';
      this.setPageScrollLocked(true);
      this.cdr.markForCheck();
      return;
    }

    this.isAuthModalOpen = false;
    this.setPageScrollLocked(false);
    this.cdr.markForCheck();
  }

  openAuthModal(tab: 'login' | 'signup'): void {
    this.isAuthModalOpen = true;
    this.authTab = tab;

    this.setPageScrollLocked(true);

    this.cdr.markForCheck();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { auth: tab },
      queryParamsHandling: 'merge',
    });
  }

  closeAuthModal(redirectToRoot = true): void {
    this.isAuthModalOpen = false;
    this.isAuthLoading = false;

    this.setPageScrollLocked(false);

    this.cdr.markForCheck();

    const onAuthRoute = this.router.url.startsWith('/auth');

    if (redirectToRoot || onAuthRoute) {
      this.router.navigate(['/'], { replaceUrl: true });
      return;
    }

    const authParam = this.route.snapshot.queryParamMap.get('auth');
    if (authParam !== null) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { auth: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  setAuthTab(tab: 'login' | 'signup'): void {
    this.openAuthModal(tab);
  }

  setUserType(userType: UserType): void {
    this.signupForm.patchValue({ userType });
    this.signupForm.markAsDirty();
    this.cdr.markForCheck();
  }

  private passwordsMatchValidator = (group: any) => {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (!password || !confirmPassword) {
      return null;
    }
    return password === confirmPassword ? null : { passwordMismatch: true };
  };

  private setPageScrollLocked(locked: boolean): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = locked ? 'hidden' : '';
      document.documentElement.style.overflow = locked ? 'hidden' : '';
    }

    if (locked) {
      this.lenis?.stop();
      return;
    }

    this.lenis?.start();
  }

  toggleLoginPassword(): void {
    this.showLoginPassword = !this.showLoginPassword;
  }

  toggleSignupPassword(): void {
    this.showSignupPassword = !this.showSignupPassword;
  }

  toggleSignupConfirmPassword(): void {
    this.showSignupConfirmPassword = !this.showSignupConfirmPassword;
  }

  loginWithGoogle(): void {
    this.snackbarService.showSnackbar(
      'Próximamente',
      'Iniciar sesión con Google requiere integración OAuth en el backend.',
      'assets/icons/warning.png',
      true,
    );
  }

  loginWithMicrosoft(): void {
    this.snackbarService.showSnackbar(
      'Próximamente',
      'Iniciar sesión con Microsoft requiere integración OAuth en el backend.',
      'assets/icons/warning.png',
      true,
    );
  }

  submitLogin(): void {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid || this.isAuthLoading) {
      return;
    }

    this.isAuthLoading = true;
    const loginRequest: LoginRequest = this.loginForm.value;

    this.authService.login(loginRequest).subscribe({
      next: (response) => {
        localStorage.setItem('token', response.token);
        localStorage.setItem(
          'user',
          JSON.stringify({
            id: response.id,
            email: response.email,
            firstName: response.firstName,
            lastName: response.lastName,
            userType: response.userType,
          }),
        );

        this.isAuthLoading = false;
        this.closeAuthModal(false);
        this.cdr.markForCheck();
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isAuthLoading = false;
        const backendMsg = error.error?.detail || 'Access Denied';

        this.snackbarService.showSnackbar(
          'Access Denied',
          backendMsg,
          'assets/icons/error.png',
          true,
        );

        this.cdr.markForCheck();
      },
    });
  }

  submitSignup(): void {
    this.signupForm.markAllAsTouched();
    if (this.signupForm.invalid || this.isAuthLoading) {
      return;
    }

    const password = this.signupForm.get('password')?.value;
    const confirmPassword = this.signupForm.get('confirmPassword')?.value;
    if (password !== confirmPassword) {
      this.snackbarService.showSnackbar(
        'Data are Missing',
        'Passwords do not match',
        'assets/icons/warning.png',
        true,
      );
      return;
    }

    this.isAuthLoading = true;

    const raw = this.signupForm.value;
    const registerRequest: RegisterRequest = {
      firstName: raw.firstName,
      lastName: raw.lastName,
      email: raw.email,
      password: raw.password,
      userType: raw.userType,
    };

    this.authService.register(registerRequest).subscribe({
      next: () => {
        this.isAuthLoading = false;
        this.snackbarService.showSnackbar(
          'Successful Record',
          'User created correctly',
          'assets/icons/success.png',
          true,
        );
        this.loginForm.patchValue({ email: registerRequest.email });
        this.setAuthTab('login');

        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isAuthLoading = false;
        const backendMsg = error.error?.detail || error.error?.message || 'Registration failed';
        this.snackbarService.showSnackbar(
          'Error',
          backendMsg,
          'assets/icons/error.png',
          true,
        );

        this.cdr.markForCheck();
      },
    });
  }

  scrollToTop(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.lenis) {
      this.lenis.scrollTo(0);
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  scrollTo(sectionId: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const el = document.getElementById(sectionId);
    if (!el) {
      return;
    }

    if (this.lenis) {
      this.lenis.scrollTo(el, { offset: -96 });
      return;
    }

    const headerOffset = 96;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
}