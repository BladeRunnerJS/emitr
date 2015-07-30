'use strict';

var Emitter = require('..');
var chai = require('chai');
var expect = chai.expect;

describe('An Emitter', function(){
	var emitter;

	beforeEach(function() {
		emitter = new Emitter();
	});

	it('when an event is triggered without listeners, then the emitter should trigger a DeadEvent.', function() {
		var receivedEvent = null;
		emitter.on(Emitter.meta.DeadEvent, function(event) {
			receivedEvent = event;
		});
		emitter.trigger('nobody-is-listening', 'parm1', 'parm2');

		expect(receivedEvent).not.to.be.null;
		expect(receivedEvent.event).to.equal('nobody-is-listening');
		expect(receivedEvent.data.length).to.equal(2);
		expect(receivedEvent.data[0]).to.equal('parm1');
		expect(receivedEvent.data[1]).to.equal('parm2');
	});

	describe('with a function registered for an event,', function() {
		var listener, called, args = [];

		beforeEach(function() {
			called = false;
			listener = function() {
				called = true;
				args = arguments;
			};
			emitter.on('event', listener);
		});

		it('when the event is emitted, then the function should be called.', function() {
			emitter.trigger('event');
			expect(called).to.be.true;
		});

		it('when the same function is registered for the same event, then it throws an error.', function() {
			var err = null;
			try {
				emitter.on('event', listener);
			} catch (e) {
				err = e;
			}
			expect(err).to.not.be.null;
		});

		it('when the event is emitted with parameters, then the function should be called with those parameters.', function() {
			emitter.trigger('event', true, false, 1, 2, 3, null);
			expect(Array.prototype.slice.call(args)).to.deep.equal([true, false, 1, 2, 3, null]);
		});

		it('when a different event is emitted, then the function should not be called.', function() {
			emitter.trigger('other event');
			expect(called).to.be.false;
		});

		describe('and then removed,', function() {
			beforeEach(function() {
				emitter.off('event', listener);
			});

			it('when the event is emitted, the function should not be called.', function() {
				emitter.trigger('event');
				expect(called).to.be.false;
			});
		});

		describe('and remove is called with a context,', function() {
			beforeEach(function() {
				emitter.off('event', listener, {});
			});

			it('then the remove should have no effect.', function() {
				emitter.trigger('event');
				expect(called).to.be.true;
			});
		});

	});

	describe('with a listener registered with a context for an event,', function() {
		var listenerObject;
		beforeEach(function() {
			listenerObject = {
				called: false,
				onEvent: function() {
					this.called = true;
				}
			};
			emitter.on('event', listenerObject.onEvent, listenerObject);
		});

		it('when the event is emitted, then the listener with context should be called with the context set.', function() {
			emitter.trigger('event');
			expect(listenerObject.called).to.be.true;
		});

		describe('and then removed,', function() {
			beforeEach(function() {
				emitter.off('event', listenerObject.onEvent, listenerObject);
			});

			it('when the event is emitted, the function should not be called.', function() {
				emitter.trigger('event');
				expect(listenerObject.called).to.be.false;
			});
		});

		describe('and remove is called without the context,', function() {
			beforeEach(function() {
				emitter.off('event', listenerObject.onEvent);
			});

			it('then the remove should have no effect.', function() {
				emitter.trigger('event');
				expect(listenerObject.called).to.be.true;
			});
		});
	});

	function fourListenerScenario() {
		describe('passes the four listener scenario: with two listeners registered with a single context and two listeners registered without a context,', function() {
			var listenerObject, called1, called2, listener1, listener2;
			beforeEach(function() {
				listenerObject = {
					called1: false,
					called2: false,
					onEvent: function() {
						this.called1 = true;
					},
					otherCallback: function() {
						this.called2 = true;
					}
				};
				called1 = false;
				called2 = false;
				listener1 = function() {
					called1 = true;
				};
				listener2 = function() {
					called2 = true;
				};
				emitter.on('event', listenerObject.onEvent, listenerObject);
				emitter.on('event2', listenerObject.otherCallback, listenerObject);
				emitter.on('event', listener1);
				emitter.on('event2', listener2);
			});

			it('when the events are emitted, all listeners should fire.', function() {
				emitter.trigger('event');
				emitter.trigger('event2');

				expect(listenerObject.called1).to.be.true;
				expect(listenerObject.called2).to.be.true;
				expect(called1).to.be.true;
				expect(called2).to.be.true;
			});

			it('when clearListeners is called with the context, both listeners with context should be cleared and the others shouldn\'t be.', function() {
				emitter.clearListeners(listenerObject);
				emitter.trigger('event');
				emitter.trigger('event2');

				expect(listenerObject.called1).to.be.false;
				expect(listenerObject.called2).to.be.false;
				expect(called1).to.be.true;
				expect(called2).to.be.true;
			});

			it('when off is called without any parameters, all listeners should be cleared.', function() {
				emitter.off();
				emitter.trigger('event');
				emitter.trigger('event2');

				expect(listenerObject.called1).to.be.false;
				expect(listenerObject.called2).to.be.false;
				expect(called1).to.be.false;
				expect(called2).to.be.false;
			});
		});
	}

	fourListenerScenario();

	describe('constructed by mixin,', function() {
		var MyObject;

		beforeEach(function() {
			MyObject = function() {};
			Emitter.mixInto(MyObject);

			emitter = new MyObject();
		});

		it('should remain an instance of its own class.', function() {
			expect(emitter instanceof MyObject).to.be.true;
		});

		fourListenerScenario();
	});

	describe('with two listeners registered, one of which removes itself when fired', function() {
		var firstFired;
		var secondFired;
		function listenerThatRemovesItself() {
			firstFired++;
			emitter.off('event', listenerThatRemovesItself);
		}
		function otherListener() {
			secondFired++;
		}
		beforeEach(function() {
			firstFired = 0;
			secondFired = 0;
			emitter.on('event', listenerThatRemovesItself);
			emitter.on('event', otherListener);
		});

		it('when the event fires the first time both listeners receive it, but the second time, only the one that doesn\'t remove itself receives it', function() {
			emitter.trigger('event');
			expect(firstFired).to.equal(1);
			expect(secondFired).to.equal(1);
			emitter.trigger('event');
			expect(firstFired).to.equal(1);
			expect(secondFired).to.equal(2);
		});

		describe('and a third listener which removes all listeners when fired', function() {
			function thirdListener() {
				emitter.off();
			}
			beforeEach(function() {
				emitter.on('event', thirdListener);
			});
			it('when the event fires the second time, no listener receives it.', function() {
				emitter.trigger('event');
				expect(firstFired).to.equal(1);
				expect(secondFired).to.equal(1);

				emitter.trigger('event');
				expect(firstFired).to.equal(1);
				expect(secondFired).to.equal(1);
			});
		});
	});

	describe('with a listener registered on MyEvent,', function() {
		var receivedEvent;
		var nextArg;
		function MyEvent(x, y) {
			this.x = x;
			this.y = y;
		}
		function listener(event, arg) {
			receivedEvent = event;
			nextArg = arg;
		}

		beforeEach(function() {
			receivedEvent = null;
			nextArg = null;
			emitter.on(MyEvent, listener);
		});

		it('when an instance of MyEvent is emitted then the listener will fire, receiving the event as the first argument.', function() {
			emitter.trigger(new MyEvent(100, 120), 'next argument');

			expect(receivedEvent).not.to.be.null;
			expect(receivedEvent.x).to.equal(100);
			expect(receivedEvent.y).to.equal(120);
			expect(receivedEvent instanceof MyEvent).to.be.true;
			expect(nextArg).to.equal('next argument');
		});

		it('when a subclass of MyEvent is emitted, then the listener will fire, receiving the event as the first argument.', function() {
			function SubClassEvent() {
				MyEvent.call(this, 99, 119);
			}
			// naive inheritance so as to work with ie8.  Don't actually do it like this.
			// use Object.create or a library like topiarist.  Any problems, and you can set
			// the superclass property manually.
			SubClassEvent.prototype = new MyEvent();
			SubClassEvent.prototype.constructor = SubClassEvent;
			SubClassEvent.superclass = MyEvent;

			emitter.trigger(new SubClassEvent());

			expect(receivedEvent).not.to.be.null;
			expect(receivedEvent.x).to.equal(99);
			expect(receivedEvent.y).to.equal(119);
			expect(receivedEvent instanceof MyEvent).to.be.true;
			expect(receivedEvent instanceof SubClassEvent).to.be.true;
		});

	});

	describe('with an AddListenerEvent listener registered,', function() {
		var receivedEvent, alertTheMedia, context;

		beforeEach(function() {
			receivedEvent = null;
			context = {};
			alertTheMedia = function() {
				throw new Error('this event doesn\'t actually occur during this test.');
			};

			emitter.on(Emitter.meta.AddListenerEvent, function(event) {
				receivedEvent = event;
			});
		});

		function verifyAddListenerEvent() {
			expect(receivedEvent instanceof Emitter.meta.AddListenerEvent).to.be.true;
			expect(receivedEvent.event).to.equal('elvis-sighted');
			expect(receivedEvent.listener).to.equal(alertTheMedia);
			expect(receivedEvent.context).to.equal(context);
		}

		it('when another listener is registered, it should fire the listener.', function() {
			emitter.on('elvis-sighted', alertTheMedia, context);
			verifyAddListenerEvent();
		});

		it('when another listener is registered using once, it should fire the AddListenerEvent with the correct listener.', function() {
			emitter.once('elvis-sighted', alertTheMedia, context);
			verifyAddListenerEvent();
		});
	});

	it('should trigger an RemoveListenerEvent when a listener is removed explicitly.', function() {
		var receivedEvent = null;
		emitter.on(Emitter.meta.RemoveListenerEvent, function(event) {
			receivedEvent = event;
		});

		function alertTheMedia() {
			throw new Error('this event doesn\'t actually occur during this test.');
		}

		emitter.on('elvis-sighted', alertTheMedia);
		emitter.off('elvis-sighted', alertTheMedia);

		expect(receivedEvent instanceof Emitter.meta.RemoveListenerEvent).to.be.true;
		expect(receivedEvent.event).to.equal('elvis-sighted');
		expect(receivedEvent.listener).to.equal(alertTheMedia);
		expect(receivedEvent.context).to.be.undefined;
	});

	describe('with two listeners registered for two different events and a listener registered for the RemoveListenerEvent,', function() {
		var receivedEvents, alertTheMedia, scrambleTheJets, context;

		beforeEach(function() {
			receivedEvents = [];
			context = {};

			emitter.on(Emitter.meta.RemoveListenerEvent, function(event) {
				receivedEvents.push(event);
			});

			alertTheMedia = function() {
				throw new Error('this event doesn\'t actually occur during this test - no need to alertTheMedia.');
			};
			scrambleTheJets = function() {
				throw new Error('this event doesn\'t actually occur during this test - no need to scrambleTheJets.');
			};

			emitter.on('elvis-sighted', alertTheMedia, context);
			emitter.on('war-with-eurasia', scrambleTheJets, context);
		});

		it('when all listeners are removed, it should trigger RemoveListenerEvents for every listener.', function() {
			emitter.off();

			expect(receivedEvents.length).to.equal(3); // because we removed ourself too.
			var elvisSpotterRemoved = false;
			var warWithEurasiaSpotterRemoved = false;
			var removeListenerSpotted = false;
			for (var i = 0; i < receivedEvents.length; ++i) {
				var event = receivedEvents[i];
				expect(event instanceof Emitter.meta.RemoveListenerEvent).to.be.true;
				if (elvisSpotterRemoved === false && event.event === 'elvis-sighted') {
					elvisSpotterRemoved = true;
					expect(event.listener).to.equal(alertTheMedia);
					expect(event.context).to.equal(context);
				} else if (warWithEurasiaSpotterRemoved === false && event.event === 'war-with-eurasia') {
					warWithEurasiaSpotterRemoved = true;
					expect(event.listener).to.equal(scrambleTheJets);
					expect(event.context).to.equal(context);
				} else if (removeListenerSpotted === false && event.event === Emitter.meta.RemoveListenerEvent) {
					removeListenerSpotted = true;
				} else {
					// there shouldn't be any others.
					throw new Error('Unexpected event : ' + event + ' in ' + receivedEvents.join(', '));
				}
			}
		});

		it('when listeners for a particular event are removed, it should trigger a RemoveListenerEvent for the removed listeners.', function() {
			emitter.off('war-with-eurasia');

			expect(receivedEvents.length).to.equal(1);
			expect(receivedEvents[0].event).to.equal('war-with-eurasia');
			expect(receivedEvents[0].listener).to.equal(scrambleTheJets);
			expect(receivedEvents[0].context).to.equal(context);
		});

		it('when listeners for a particular context are removed, it should trigger RemoveListenerEvents for the removed listeners.', function() {
			emitter.clearListeners(context);

			expect(receivedEvents.length).to.equal(2);
			var elvisSpotterRemoved = false;
			var warWithEurasiaSpotterRemoved = false;
			for (var i = 0; i < receivedEvents.length; ++i) {
				var event = receivedEvents[i];
				expect(event instanceof Emitter.meta.RemoveListenerEvent).to.be.true;
				if (elvisSpotterRemoved === false && event.event === 'elvis-sighted') {
					elvisSpotterRemoved = true;
					expect(event.listener).to.equal(alertTheMedia);
					expect(event.context).to.equal(context);
				} else if (warWithEurasiaSpotterRemoved === false && event.event === 'war-with-eurasia') {
					warWithEurasiaSpotterRemoved = true;
					expect(event.listener).to.equal(scrambleTheJets);
					expect(event.context).to.equal(context);
				} else {
					// there shouldn't be any others.
					throw new Error('Unexpected event : ' + event);
				}
			}
		});

	});

	it('should trigger listeners added with once, no more than once.', function() {
		var called = 0;
		emitter.once('tricksy', function() {
			emitter.trigger('tricksy');
		});
		emitter.once('tricksy', function() {
			emitter.trigger('tricksy');
		});
		emitter.on('tricksy', function() {
			called++;
		});

		emitter.trigger('tricksy');
		emitter.trigger('tricksy');

		expect(called).to.equal(4);
	});

	it('should trigger all listeners even if one throws an exception', function() {
		var called = false;
		emitter.on('ev', function() {
			throw 'error';
		});
		emitter.on('ev', function() {
			called = true;
		});

		emitter.trigger('ev');

		expect(called).to.be.true;
	});
});
